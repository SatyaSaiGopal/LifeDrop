/**
 * End-to-end API test suite.
 *
 * Boots an ephemeral MongoDB (mongodb-memory-server), starts the real Express
 * app against it and drives every core flow over HTTP. No mocks: the tests
 * exercise the same code paths a running server uses.
 *
 * Run with: npm test
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-not-for-production-use-only';

const assert = require('assert');
const { MongoMemoryServer } = require('mongodb-memory-server');

const results = [];
let currentGroup = 'general';

function group(name) {
  currentGroup = name;
}
async function test(name, fn) {
  try {
    await fn();
    results.push({ group: currentGroup, name, ok: true });
    process.stdout.write(`  \x1b[32mPASS\x1b[0m ${name}\n`);
  } catch (err) {
    results.push({ group: currentGroup, name, ok: false, error: err });
    process.stdout.write(`  \x1b[31mFAIL\x1b[0m ${name}\n        ${err.message}\n`);
  }
}

let baseUrl;
let server;
// Set once the primary donor registers; used by later profile tests.
let donorClientProfileId = null;

/** Thin fetch wrapper that carries the session cookie. */
function makeClient() {
  let cookie = null;
  return {
    get cookie() {
      return cookie;
    },
    set cookie(v) {
      cookie = v;
    },
    async request(method, path, body) {
      const headers = { 'Content-Type': 'application/json' };
      if (cookie) headers.Cookie = cookie;
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      const session = setCookie.find((c) => c.startsWith('lifeline_token='));
      if (session) cookie = session.split(';')[0];
      let json = null;
      const text = await res.text();
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = { raw: text };
      }
      return { status: res.status, body: json };
    },
    get(p) { return this.request('GET', p); },
    post(p, b) { return this.request('POST', p, b); },
    patch(p, b) { return this.request('PATCH', p, b); },
  };
}

// Bengaluru centre — the seed data clusters around it.
const BLR = { lat: 12.9716, lng: 77.5946 };

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('lifeline_test');

  const { connect, disconnect } = require('../src/config/db');
  const { createApp } = require('../src/app');
  const User = require('../src/models/User');
  const DonorProfile = require('../src/models/DonorProfile');
  const BloodRequest = require('../src/models/BloodRequest');

  await connect();
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const passwordHash = await User.hashPassword('Demo@1234');

  // ---- Fixtures: a small, controlled donor population around Bengaluru ----
  async function makeDonor({ name, email, group, lat, lng, available = true, lastDonationDate = null, city = 'Bengaluru', phone = '+91 9876543210' }) {
    const user = await User.create({ name, email, phone, passwordHash, role: 'donor' });
    const profile = await DonorProfile.create({
      user: user._id,
      donorName: name,
      bloodGroup: group,
      dateOfBirth: new Date('1994-05-10'),
      gender: 'male',
      lastDonationDate,
      available,
      location: { type: 'Point', coordinates: [lng, lat] },
      city,
      state: 'Karnataka',
      country: 'India',
      areaLabel: `${city} central`,
      preferredContactMethod: 'phone',
    });
    user.profile = profile._id;
    await user.save();
    return { user, profile };
  }

  // ~0.9 km north, ~3 km north, ~20 km north, ~80 km north of centre.
  const dNear = await makeDonor({ name: 'Near Donor', email: 'near@test.dev', group: 'O+', lat: 12.9796, lng: 77.5946 });
  const dMid = await makeDonor({ name: 'Mid Donor', email: 'mid@test.dev', group: 'O+', lat: 12.9986, lng: 77.5946, available: false });
  const dFar = await makeDonor({ name: 'Far Donor', email: 'far@test.dev', group: 'A+', lat: 13.1516, lng: 77.5946 });
  const dVeryFar = await makeDonor({ name: 'Distant Donor', email: 'distant@test.dev', group: 'O-', lat: 13.6916, lng: 77.5946, city: 'Devanahalli' });
  const dRecent = await makeDonor({
    name: 'Recent Donor', email: 'recent@test.dev', group: 'B+', lat: 12.9766, lng: 77.5996,
    lastDonationDate: new Date(Date.now() - 10 * 24 * 3600 * 1000), // 10 days ago -> ineligible
  });

  const seeker = makeClient();

  // ================================================================ health
  group('Health & errors');
  await test('GET /api/health returns ok', async () => {
    const c = makeClient();
    const r = await c.get('/api/health');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.status, 'ok');
  });
  await test('unknown route returns 404 envelope', async () => {
    const c = makeClient();
    const r = await c.get('/api/nope');
    assert.strictEqual(r.status, 404);
    assert.strictEqual(r.body.success, false);
    assert.ok(r.body.error.message);
  });

  // ================================================================ auth
  group('Authentication');
  const donorClient = makeClient();
  await test('register donor returns 201 and sets session cookie', async () => {
    const r = await donorClient.post('/api/auth/register', {
      name: 'Asha Verma',
      email: 'asha@test.dev',
      phone: '+91 9000000001',
      password: 'Secret@123',
      role: 'donor',
      bloodGroup: 'O+',
      dateOfBirth: '1995-03-12',
      gender: 'female',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      latitude: 12.9721,
      longitude: 77.5933,
      available: true,
      preferredContactMethod: 'phone',
    });
    assert.strictEqual(r.status, 201, JSON.stringify(r.body));
    assert.strictEqual(r.body.data.user.email, 'asha@test.dev');
    assert.ok(r.body.data.user.profile, 'donor profile created');
    assert.ok(donorClient.cookie, 'session cookie set');
    donorClientProfileId = r.body.data.user.profile.id;
  });
  await test('registration never returns the password hash', async () => {
    const r = await donorClient.get('/api/auth/me');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.user.passwordHash, undefined);
  });
  await test('duplicate email returns 409', async () => {
    const c = makeClient();
    const r = await c.post('/api/auth/register', {
      name: 'Copy Cat', email: 'asha@test.dev', phone: '+91 9000000002', password: 'Secret@123', role: 'seeker',
    });
    assert.strictEqual(r.status, 409);
    assert.ok(r.body.error.details.email);
  });
  await test('weak password returns 400 with field detail', async () => {
    const c = makeClient();
    const r = await c.post('/api/auth/register', {
      name: 'Weak Pw', email: 'weak@test.dev', phone: '+91 9000000003', password: 'abc', role: 'seeker',
    });
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.error.details.password);
  });
  await test('donor registration without location is rejected', async () => {
    const c = makeClient();
    const r = await c.post('/api/auth/register', {
      name: 'No Location', email: 'noloc@test.dev', phone: '+91 9000000004', password: 'Secret@123', role: 'donor',
      bloodGroup: 'A+', dateOfBirth: '1990-01-01', gender: 'male', city: 'Pune', state: 'MH', country: 'India',
    });
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.error.details.latitude || r.body.error.details.longitude);
  });
  await test('login with correct credentials succeeds', async () => {
    const c = makeClient();
    const r = await c.post('/api/auth/login', { email: 'asha@test.dev', password: 'Secret@123' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.user.name, 'Asha Verma');
    assert.ok(c.cookie);
  });
  await test('login with wrong password returns 401 (no enumeration)', async () => {
    const c = makeClient();
    const r = await c.post('/api/auth/login', { email: 'asha@test.dev', password: 'WrongPass1' });
    assert.strictEqual(r.status, 401);
    const r2 = await c.post('/api/auth/login', { email: 'ghost@test.dev', password: 'WrongPass1' });
    assert.strictEqual(r2.status, 401);
    assert.strictEqual(r.body.error.message, r2.body.error.message, 'same message for both cases');
  });
  await test('protected route without auth returns 401', async () => {
    const c = makeClient();
    const r = await c.get('/api/auth/me');
    assert.strictEqual(r.status, 401);
  });
  await test('logout clears the session', async () => {
    const c = makeClient();
    await c.post('/api/auth/login', { email: 'asha@test.dev', password: 'Secret@123' });
    const out = await c.post('/api/auth/logout');
    assert.strictEqual(out.status, 200);
    c.cookie = null; // browser drops the cleared cookie
    const me = await c.get('/api/auth/me');
    assert.strictEqual(me.status, 401);
  });

  // ================================================================ search
  group('Geospatial donor search');
  await test('nearby search returns donors sorted by distance', async () => {
    const c = makeClient();
    const r = await c.get(`/api/donors/nearby?lat=${BLR.lat}&lng=${BLR.lng}&radius=25`);
    assert.strictEqual(r.status, 200);
    const ids = r.body.data.map((d) => d.id);
    assert.ok(ids.includes(dNear.profile._id.toString()), 'near donor present');
    assert.ok(ids.includes(dFar.profile._id.toString()), '20km donor within a 25km radius');
    assert.ok(!ids.includes(dVeryFar.profile._id.toString()), '80km donor outside a 25km radius');
    // Results must be ordered nearest-first.
    const distances = r.body.data.map((d) => d.distanceKm);
    const sorted = [...distances].sort((a, b) => a - b);
    assert.deepStrictEqual(distances, sorted, 'results sorted by distance');
  });
  await test('radius narrows the result set', async () => {
    const c = makeClient();
    const r5 = await c.get(`/api/donors/nearby?lat=${BLR.lat}&lng=${BLR.lng}&radius=5`);
    const r50 = await c.get(`/api/donors/nearby?lat=${BLR.lat}&lng=${BLR.lng}&radius=50`);
    assert.ok(r50.body.meta.total >= r5.body.meta.total, 'larger radius finds at least as many');
    const ids5 = r5.body.data.map((d) => d.id);
    assert.ok(!ids5.includes(dFar.profile._id.toString()), '20km donor outside 5km radius');
    const ids50 = r50.body.data.map((d) => d.id);
    assert.ok(ids50.includes(dFar.profile._id.toString()), '20km donor inside 50km radius');
  });
  await test('distance is returned in kilometres', async () => {
    const c = makeClient();
    const r = await c.get(`/api/donors/nearby?lat=${BLR.lat}&lng=${BLR.lng}&radius=5`);
    const near = r.body.data.find((d) => d.id === dNear.profile._id.toString());
    assert.ok(near.distanceKm !== null && near.distanceKm < 2, `expected <2km, got ${near.distanceKm}`);
  });
  await test('blood group filter is applied', async () => {
    const c = makeClient();
    const r = await c.get(`/api/donors/nearby?lat=${BLR.lat}&lng=${BLR.lng}&radius=50&bloodGroup=A%2B`);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.data.every((d) => d.bloodGroup === 'A+'));
    assert.ok(r.body.data.some((d) => d.id === dFar.profile._id.toString()));
  });
  await test('availability filter excludes unavailable donors', async () => {
    const c = makeClient();
    const r = await c.get(`/api/donors/nearby?lat=${BLR.lat}&lng=${BLR.lng}&radius=10&available=true`);
    assert.ok(r.body.data.every((d) => d.available === true));
    assert.ok(!r.body.data.some((d) => d.id === dMid.profile._id.toString()), 'unavailable donor excluded');
  });
  await test('exact coordinates are never exposed publicly', async () => {
    const c = makeClient();
    const r = await c.get(`/api/donors/nearby?lat=${BLR.lat}&lng=${BLR.lng}&radius=10`);
    const donor = r.body.data.find((d) => d.id === dNear.profile._id.toString());
    assert.ok(donor.approxLocation, 'approximate location provided');
    assert.ok(!JSON.stringify(donor).includes('12.9796'), 'raw latitude not present');
    assert.strictEqual(donor.phone, undefined);
    assert.strictEqual(donor.email, undefined);
    assert.strictEqual(donor.dateOfBirth, undefined);
  });
  await test('invalid latitude returns 400', async () => {
    const c = makeClient();
    const r = await c.get('/api/donors/nearby?lat=999&lng=77.5&radius=10');
    assert.strictEqual(r.status, 400);
  });
  await test('empty result set returns an empty array, not an error', async () => {
    const c = makeClient();
    // Middle of the Indian Ocean.
    const r = await c.get('/api/donors/nearby?lat=-5&lng=70&radius=5');
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(r.body.data, []);
    assert.strictEqual(r.body.meta.total, 0);
  });
  await test('donor list endpoint filters by blood group', async () => {
    const c = makeClient();
    const r = await c.get('/api/donors?bloodGroup=B%2B');
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.data.every((d) => d.bloodGroup === 'B+'));
  });
  await test('cities endpoint returns donor counts', async () => {
    const c = makeClient();
    const r = await c.get('/api/donors/cities');
    assert.strictEqual(r.status, 200);
    const blr = r.body.data.find((x) => x.city === 'Bengaluru');
    assert.ok(blr && blr.donorCount > 0);
  });
  await test('stats endpoint aggregates counts', async () => {
    const c = makeClient();
    const r = await c.get('/api/donors/stats');
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.data.total > 0);
    assert.ok(Array.isArray(r.body.data.byGroup));
  });

  // ================================================================ profile
  group('Donor profile');
  await test('public donor profile hides contact details', async () => {
    const c = makeClient();
    const r = await c.get(`/api/donors/${dNear.profile._id}`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.donor.name, 'Near Donor');
    assert.strictEqual(r.body.data.donor.phone, undefined);
    assert.strictEqual(r.body.data.canViewContact, false);
  });
  await test('contact endpoint blocks unrelated users', async () => {
    const r = await donorClient.get(`/api/donors/${dNear.profile._id}/contact`);
    assert.strictEqual(r.status, 403);
  });
  await test('donor can view own contact details', async () => {
    const c = makeClient();
    await c.post('/api/auth/login', { email: 'near@test.dev', password: 'Demo@1234' });
    const me = await c.get('/api/auth/me');
    const ownId = me.body.data.user.profile.id;
    const r = await c.get(`/api/donors/${ownId}/contact`);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.data.contact.phone);
  });
  await test('donor can update own profile', async () => {
    const r = await donorClient.patch(`/api/donors/${donorClientProfileId}`, { bio: 'Updated bio text', city: 'Mysuru' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.profile.bio, 'Updated bio text');
    assert.strictEqual(r.body.data.profile.city, 'Mysuru');
  });
  await test('donor cannot edit another donor profile', async () => {
    const r = await donorClient.patch(`/api/donors/${dNear.profile._id}`, { bio: 'hacked' });
    assert.strictEqual(r.status, 403);
  });
  await test('invalid blood group on update returns 400', async () => {
    const r = await donorClient.patch(`/api/donors/${donorClientProfileId}`, { bloodGroup: 'C+' });
    assert.strictEqual(r.status, 400);
  });
  await test('availability toggle persists and affects search', async () => {
    const me = await donorClient.get('/api/auth/me');
    const id = me.body.data.user.profile.id;
    const off = await donorClient.patch(`/api/donors/${id}/availability`, { available: false });
    assert.strictEqual(off.status, 200);
    assert.strictEqual(off.body.data.profile.available, false);

    const c = makeClient();
    const search = await c.get(`/api/donors/nearby?lat=12.9721&lng=77.5933&radius=10&available=true`);
    assert.ok(!search.body.data.some((d) => d.id === id), 'unavailable donor absent from available search');

    const all = await c.get(`/api/donors/nearby?lat=12.9721&lng=77.5933&radius=10&available=all`);
    assert.ok(all.body.data.some((d) => d.id === id), 'still visible in "all donors" search');

    const on = await donorClient.patch(`/api/donors/${id}/availability`, { available: true });
    assert.strictEqual(on.body.data.profile.available, true);
  });
  await test('profile update syncs the denormalised donor name', async () => {
    const me = await donorClient.get('/api/auth/me');
    const id = me.body.data.user.profile.id;
    await donorClient.patch(`/api/donors/${id}`, { name: 'Asha V Verma' });
    const c = makeClient();
    const r = await c.get(`/api/donors/${id}`);
    assert.strictEqual(r.body.data.donor.name, 'Asha V Verma');
  });
  await test('eligibility reflects a recent donation', async () => {
    const c = makeClient();
    const r = await c.get(`/api/donors/${dRecent.profile._id}`);
    assert.strictEqual(r.body.data.donor.eligibility.eligible, false);
    assert.ok(r.body.data.donor.eligibility.reason);
  });

  // ================================================================ requests
  group('Blood requests');
  let requestId;
  await test('authenticated user can create a blood request', async () => {
    const r = await donorClient.post('/api/requests', {
      patientName: 'Ravi Verma',
      bloodGroup: 'O+',
      unitsRequired: 2,
      hospitalName: 'City General Hospital',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      latitude: 12.9716,
      longitude: 77.5946,
      requiredAt: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
      urgency: 'high',
      message: 'Surgery scheduled, need two units.',
      contactPhone: '+91 9000000001',
    });
    assert.strictEqual(r.status, 201, JSON.stringify(r.body));
    requestId = r.body.data.request.id;
    assert.strictEqual(r.body.data.request.status, 'pending');
    assert.ok(Array.isArray(r.body.data.matches));
    // Matches must respect blood compatibility: O+ recipient can receive O+, O-.
    assert.ok(r.body.data.matches.every((m) => ['O+', 'O-'].includes(m.bloodGroup)));
  });
  await test('unauthenticated request creation returns 401', async () => {
    const c = makeClient();
    const r = await c.post('/api/requests', {
      patientName: 'X', bloodGroup: 'O+', unitsRequired: 1, hospitalName: 'Y',
      city: 'Z', country: 'India', latitude: 12, longitude: 77,
      requiredAt: new Date(Date.now() + 86400000).toISOString(),
    });
    assert.strictEqual(r.status, 401);
  });
  await test('past required date is rejected', async () => {
    const r = await donorClient.post('/api/requests', {
      patientName: 'Past', bloodGroup: 'A+', unitsRequired: 1, hospitalName: 'Test Hospital',
      city: 'Bengaluru', country: 'India', latitude: 12.97, longitude: 77.59,
      requiredAt: '2020-01-01T00:00:00.000Z',
    });
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.error.details.requiredAt);
  });
  await test('request appears in the public feed', async () => {
    const c = makeClient();
    const r = await c.get('/api/requests?status=open');
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.data.some((x) => x.id === requestId));
    const item = r.body.data.find((x) => x.id === requestId);
    assert.strictEqual(item.contactPhone, null, 'requester phone hidden from feed');
  });
  await test('request feed filters by blood group', async () => {
    const c = makeClient();
    const r = await c.get('/api/requests?bloodGroup=O%2B');
    assert.ok(r.body.data.every((x) => x.bloodGroup === 'O+'));
  });
  await test('donor sees the request and can accept it', async () => {
    const c = makeClient();
    await c.post('/api/auth/login', { email: 'near@test.dev', password: 'Demo@1234' });
    const view = await c.get(`/api/requests/${requestId}`);
    assert.strictEqual(view.status, 200);

    const acc = await c.post(`/api/requests/${requestId}/accept`, {});
    assert.strictEqual(acc.status, 200, JSON.stringify(acc.body));
    assert.strictEqual(acc.body.data.respondedAs, 'accepted');
    assert.strictEqual(acc.body.data.request.myResponse.status, 'accepted');
    assert.strictEqual(acc.body.data.request.status, 'accepted', 'request moves to accepted');
  });
  await test('accepting donor can then view requester contact', async () => {
    const c = makeClient();
    await c.post('/api/auth/login', { email: 'near@test.dev', password: 'Demo@1234' });
    const r = await c.get(`/api/requests/${requestId}`);
    assert.strictEqual(r.body.data.canViewContact, true);
    assert.ok(r.body.data.request.contactPhone);
  });
  await test('accepting donor can now view the requester contact on donor card', async () => {
    // The requester (Asha) is a donor; the accepting donor should see contact.
    const c = makeClient();
    await c.post('/api/auth/login', { email: 'near@test.dev', password: 'Demo@1234' });
    const me = await c.get('/api/auth/me');
    const ashaProfileId = donorClientProfileId;
    const r = await c.get(`/api/donors/${ashaProfileId}/contact`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.reason, 'accepted_request');
  });
  await test('respond is idempotent — declining updates, does not duplicate', async () => {
    const c = makeClient();
    await c.post('/api/auth/login', { email: 'near@test.dev', password: 'Demo@1234' });
    const dec = await c.post(`/api/requests/${requestId}/decline`, { note: 'Cannot make it' });
    assert.strictEqual(dec.status, 200);
    assert.strictEqual(dec.body.data.respondedAs, 'declined');
    const feed = await c.get(`/api/requests?scope=responded`);
    const item = feed.body.data.find((x) => x.id === requestId);
    const mine = item.responses.filter((r) => r.status === 'declined' || r.status === 'accepted');
    assert.strictEqual(mine.length, 1, 'exactly one response entry per donor');
    // Re-accept so the fulfilled path can be tested.
    await c.post(`/api/requests/${requestId}/accept`, {});
  });
  await test('donor cannot respond to their own request', async () => {
    const own = await donorClient.post('/api/requests', {
      patientName: 'Self', bloodGroup: 'O+', unitsRequired: 1, hospitalName: 'Test Hospital',
      city: 'Bengaluru', country: 'India', latitude: 12.9716, longitude: 77.5946,
      requiredAt: new Date(Date.now() + 86400000).toISOString(),
    });
    const r = await donorClient.post(`/api/requests/${own.body.data.request.id}/accept`, {});
    assert.strictEqual(r.status, 409);
  });
  await test('non-owner cannot cancel a request', async () => {
    const c = makeClient();
    await c.post('/api/auth/login', { email: 'near@test.dev', password: 'Demo@1234' });
    const r = await c.post(`/api/requests/${requestId}/cancel`, {});
    assert.strictEqual(r.status, 403);
  });
  await test('owner can mark a request fulfilled', async () => {
    const r = await donorClient.post(`/api/requests/${requestId}/fulfill`, {});
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.request.status, 'fulfilled');
    assert.ok(r.body.data.request.fulfilledAt);
  });
  await test('a fulfilled request cannot be cancelled', async () => {
    const r = await donorClient.post(`/api/requests/${requestId}/cancel`, {});
    assert.strictEqual(r.status, 409);
  });
  await test('owner can cancel a pending request', async () => {
    const created = await donorClient.post('/api/requests', {
      patientName: 'Cancel Me', bloodGroup: 'A+', unitsRequired: 1, hospitalName: 'Test Hospital',
      city: 'Bengaluru', country: 'India', latitude: 12.9716, longitude: 77.5946,
      requiredAt: new Date(Date.now() + 86400000).toISOString(),
    });
    const id = created.body.data.request.id;
    const r = await donorClient.post(`/api/requests/${id}/cancel`, {});
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.request.status, 'cancelled');
    const again = await donorClient.post(`/api/requests/${id}/cancel`, {});
    assert.strictEqual(again.status, 409);
  });
  await test('owner can edit an open request', async () => {
    const created = await donorClient.post('/api/requests', {
      patientName: 'Edit Me', bloodGroup: 'B+', unitsRequired: 1, hospitalName: 'Old Hospital',
      city: 'Bengaluru', country: 'India', latitude: 12.9716, longitude: 77.5946,
      requiredAt: new Date(Date.now() + 86400000).toISOString(),
    });
    const id = created.body.data.request.id;
    const r = await donorClient.patch(`/api/requests/${id}`, { hospitalName: 'New Hospital', unitsRequired: 3 });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.request.hospitalName, 'New Hospital');
    assert.strictEqual(r.body.data.request.unitsRequired, 3);
  });
  await test('matches endpoint is owner-only and returns compatible donors', async () => {
    const created = await donorClient.post('/api/requests', {
      patientName: 'Match Me', bloodGroup: 'O+', unitsRequired: 1, hospitalName: 'Test Hospital',
      city: 'Bengaluru', country: 'India', latitude: 12.9716, longitude: 77.5946,
      requiredAt: new Date(Date.now() + 86400000).toISOString(),
    });
    const id = created.body.data.request.id;
    const mine = await donorClient.get(`/api/requests/${id}/matches?radius=50`);
    assert.strictEqual(mine.status, 200);
    assert.ok(mine.body.data.length > 0);
    assert.ok(mine.body.data.every((m) => ['O+', 'O-'].includes(m.bloodGroup)));

    const c = makeClient();
    const other = await c.get(`/api/requests/${id}/matches`);
    assert.strictEqual(other.status, 401, 'anonymous viewer is unauthenticated');

    // A signed-in donor who does not own the request is forbidden, not 401.
    const rival = makeClient();
    await rival.post('/api/auth/login', { email: 'mid@test.dev', password: 'Demo@1234' });
    const forbidden = await rival.get(`/api/requests/${id}/matches`);
    assert.strictEqual(forbidden.status, 403, 'authenticated non-owner is forbidden');
  });
  await test('missing request returns 404', async () => {
    const c = makeClient();
    const r = await c.get('/api/requests/000000000000000000000000');
    assert.strictEqual(r.status, 404);
  });
  await test('malformed id returns 400', async () => {
    const c = makeClient();
    const r = await c.get('/api/requests/not-an-id');
    assert.strictEqual(r.status, 400);
  });

  // ================================================================ dashboard
  group('Dashboard');
  await test('dashboard returns role-appropriate data for a donor', async () => {
    const c = makeClient();
    await c.post('/api/auth/login', { email: 'near@test.dev', password: 'Demo@1234' });
    const r = await c.get('/api/dashboard');
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    assert.ok(r.body.data.donor, 'donor block present');
    assert.ok(Array.isArray(r.body.data.nearbyRequests));
    assert.ok(r.body.data.myRequestSummary);
    assert.ok(Array.isArray(r.body.data.respondedRequests));
  });
  await test('dashboard requires authentication', async () => {
    const c = makeClient();
    const r = await c.get('/api/dashboard');
    assert.strictEqual(r.status, 401);
  });

  // ================================================================ summary
  const failed = results.filter((r) => !r.ok);
  process.stdout.write(`\n${results.length - failed.length}/${results.length} tests passed\n`);
  if (failed.length) {
    process.stdout.write('\nFailures:\n');
    for (const f of failed) process.stdout.write(`  [${f.group}] ${f.name}\n    ${f.error.stack}\n`);
  }

  await new Promise((resolve) => server.close(resolve));
  await disconnect();
  await mongod.stop();
  process.exit(failed.length ? 1 : 0);
}

// Declared above; kept here for reference in the summary block.
const originalRegisterCheck = null;

main().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
