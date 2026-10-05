/**
 * Smoke-verification script (not part of the test suite).
 * Boots the real app against the configured MongoDB and exercises the seeded
 * data over HTTP, printing a readable report. Useful for confirming a local
 * setup end to end:  node scripts/verify.js
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const { connect, disconnect } = require('../src/config/db');
const { createApp } = require('../src/app');
const DonorProfile = require('../src/models/DonorProfile');

const BLR = { lat: 12.9716, lng: 77.5946 };

async function main() {
  await connect();
  const app = createApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  const line = (t) => console.log(`\n${t}`);
  const ok = (t) => console.log(`  ok   ${t}`);

  line('Indexes on donor_profiles:');
  const idx = await DonorProfile.collection.indexes();
  for (const i of idx) console.log(`  ${i.name}: ${JSON.stringify(i.key)}`);

  line('Seeded population:');
  const total = await DonorProfile.countDocuments();
  console.log(`  donors: ${total}`);
  const groups = await DonorProfile.aggregate([
    { $group: { _id: '$bloodGroup', n: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  console.log(`  by group: ${groups.map((g) => `${g._id}=${g.n}`).join(' ')}`);

  line('GET /api/donors/stats');
  const stats = await (await fetch(`${base}/api/donors/stats`)).json();
  console.log(`  total=${stats.data.total} available=${stats.data.available} cities=${stats.data.cityCount}`);

  line('GET /api/donors/nearby (Bengaluru, O+, 10km, available)');
  const near = await (
    await fetch(`${base}/api/donors/nearby?lat=${BLR.lat}&lng=${BLR.lng}&radius=10&bloodGroup=O%2B&available=true&limit=5`)
  ).json();
  console.log(`  meta: total=${near.meta.total} radiusKm=${near.meta.radiusKm}`);
  for (const d of near.data) {
    console.log(`  ${d.name.padEnd(22)} ${d.bloodGroup.padEnd(3)} ${String(d.distanceKm).padStart(6)}km  ${d.city}  approx=[${d.approxLocation}]`);
  }
  if (near.data.length === 0) console.log('  (none in this radius)');

  line('Distance ordering check (radius=50):');
  const wide = await (await fetch(`${base}/api/donors/nearby?lat=${BLR.lat}&lng=${BLR.lng}&radius=50&limit=10`)).json();
  const dists = wide.data.map((d) => d.distanceKm);
  console.log(`  distances: ${dists.join(', ')}`);
  console.log(`  sorted: ${JSON.stringify(dists) === JSON.stringify([...dists].sort((a, b) => a - b)) ? 'yes' : 'NO'}`);

  line('Radius narrowing (Bengaluru, all groups):');
  for (const r of [5, 10, 25, 50]) {
    const res = await (await fetch(`${base}/api/donors/nearby?lat=${BLR.lat}&lng=${BLR.lng}&radius=${r}&limit=1`)).json();
    console.log(`  ${String(r).padStart(2)} km -> ${res.meta.total} donors`);
  }

  line('Privacy check on a public donor payload:');
  const sample = near.data[0] || wide.data[0];
  if (sample) {
    const raw = JSON.stringify(sample);
    const leaks = ['passwordHash', 'dateOfBirth', '"email"', '"phone"', 'location'].filter((k) => raw.includes(k));
    console.log(`  keys: ${Object.keys(sample).join(', ')}`);
    console.log(`  sensitive keys present: ${leaks.length ? leaks.join(', ') : 'none'}`);
  }

  line('Auth round-trip (seeker1 demo account):');
  const jar = [];
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'seeker1@demo.lifeline.test', password: 'Demo@1234' }),
  });
  const setC = loginRes.headers.getSetCookie();
  const cookie = setC.find((c) => c.startsWith('lifeline_token=')).split(';')[0];
  jar.push(cookie);
  const loginJson = await loginRes.json();
  ok(`login ${loginRes.status} as ${loginJson.data.user.name} (role=${loginJson.data.user.role})`);

  const dash = await (await fetch(`${base}/api/dashboard`, { headers: { Cookie: cookie } })).json();
  ok(`dashboard: myRequests=${dash.data.myRequests.length} summary=${JSON.stringify(dash.data.myRequestSummary)}`);
  if (dash.data.nearbyMatchingDonors) ok(`matching donors for open request: ${dash.data.nearbyMatchingDonors.length}`);

  const feed = await (await fetch(`${base}/api/requests?status=open&limit=5`)).json();
  ok(`open requests in feed: ${feed.meta.total}`);

  const bad = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'seeker1@demo.lifeline.test', password: 'wrong-password' }),
  });
  ok(`wrong password -> ${bad.status}`);

  line('Done.');

  await new Promise((resolve) => server.close(resolve));
  await disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await disconnect().catch(() => {});
  process.exit(1);
});
