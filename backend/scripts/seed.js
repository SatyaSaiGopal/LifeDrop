/**
 * Development seed data.
 *
 * All people, emails and phone numbers below are FICTIONAL and generated for
 * local development only. Coordinates are approximate city-centre points with
 * a small random jitter so radius searches return a realistic spread.
 *
 * Usage:
 *   npm run seed            # insert demo data (idempotent)
 *   npm run seed:destroy    # remove demo data
 */
const { connect, disconnect } = require('../src/config/db');
const User = require('../src/models/User');
const DonorProfile = require('../src/models/DonorProfile');
const BloodRequest = require('../src/models/BloodRequest');
const logger = require('../src/utils/logger');

// Demo accounts share this password so the app can be exercised locally.
const DEMO_PASSWORD = 'Demo@1234';
// Tag demo accounts so they can be removed without touching real data.
const DEMO_EMAIL_DOMAIN = 'demo.lifeline.test';

/** Deterministic pseudo-random so re-seeding produces the same spread. */
let seed = 42;
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function jitter(base, spreadDeg) {
  return base + (rand() - 0.5) * spreadDeg;
}

const CITIES = [
  { city: 'Bengaluru', state: 'Karnataka', country: 'India', lat: 12.9716, lng: 77.5946, spread: 0.14 },
  { city: 'Mumbai', state: 'Maharashtra', country: 'India', lat: 19.076, lng: 72.8777, spread: 0.14 },
  { city: 'Delhi', state: 'Delhi', country: 'India', lat: 28.6139, lng: 77.209, spread: 0.14 },
  { city: 'Hyderabad', state: 'Telangana', country: 'India', lat: 17.385, lng: 78.4867, spread: 0.12 },
  { city: 'Pune', state: 'Maharashtra', country: 'India', lat: 18.5204, lng: 73.8567, spread: 0.10 },
  { city: 'Chennai', state: 'Tamil Nadu', country: 'India', lat: 13.0827, lng: 80.2707, spread: 0.12 },
];

const AREAS = {
  Bengaluru: ['Koramangala', 'Indiranagar', 'Whitefield', 'Jayanagar', 'HSR Layout', 'Rajajinagar', 'Hebbal'],
  Mumbai: ['Andheri West', 'Bandra', 'Powai', 'Dadar', 'Malad', 'Chembur'],
  Delhi: ['Saket', 'Hauz Khas', 'Dwarka', 'Rohini', 'Karol Bagh', 'Vasant Kunj'],
  Hyderabad: ['Gachibowli', 'Banjara Hills', 'Kukatpally', 'Madhapur', 'Secunderabad'],
  Pune: ['Kothrud', 'Viman Nagar', 'Baner', 'Hinjewadi', 'Kalyani Nagar'],
  Chennai: ['Adyar', 'Velachery', 'Anna Nagar', 'T. Nagar', 'OMR'],
};

const FIRST_NAMES = [
  'Aarav', 'Ananya', 'Rohan', 'Diya', 'Kabir', 'Isha', 'Arjun', 'Meera', 'Vihaan', 'Saanvi',
  'Aditya', 'Kavya', 'Rahul', 'Nisha', 'Siddharth', 'Pooja', 'Karthik', 'Ananya', 'Manish', 'Shreya',
  'Devansh', 'Riya', 'Nikhil', 'Tara', 'Yash', 'Aisha', 'Harsh', 'Neha', 'Varun', 'Sneha',
  'Ravi', 'Priya', 'Amit', 'Divya', 'Sanjay', 'Lakshmi', 'Farhan', 'Zoya', 'Imran', 'Fatima',
  'Joseph', 'Maria', 'Daniel', 'Grace', 'Vikram', 'Sanya', 'Rohit', 'Anjali', 'Tarun', 'Kritika',
  'Gaurav', 'Preeti', 'Manoj', 'Deepa', 'Akash', 'Swati', 'Rishabh', 'Nandini', 'Sahil', 'Bhavna',
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Singh', 'Gupta', 'Rao', 'Mehta', 'Kumar',
  'Das', 'Joshi', 'Chopra', 'Menon', 'Khan', 'Fernandes', 'Bose', 'Pillai', 'Verma', 'Shetty',
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
// Realistic population mix: O+ and B+ are the most common groups.
const GROUP_WEIGHTS = { 'O+': 22, 'A+': 18, 'B+': 24, 'AB+': 6, 'O-': 4, 'A-': 3, 'B-': 2, 'AB-': 1 };

const BIOS = [
  'Regular donor since college. Happy to help on short notice within the city.',
  'Believe in giving back. Available most weekends and after 6pm on weekdays.',
  'First-time donor looking to make it a habit. Nearby hospitals preferred.',
  'O-negative donor — I keep my phone on when hospitals call.',
  'Working professional. Can travel within a 20 km radius for emergencies.',
  'Part of a local volunteer group. We often donate together as a team.',
  'Prefer a message first, then a call. I check this app daily.',
  'Donating regularly for the last few years. Glad to be on this platform.',
];

const HOSPITALS = [
  'City General Hospital', 'Apollo Memorial Hospital', 'St. Mary Medical Centre',
  'Sunrise Multispeciality Hospital', 'District Civil Hospital', 'Lakeside Care Hospital',
  'Metro Trauma Centre', 'Green Valley Hospital',
];

const REQUEST_MESSAGES = [
  'My father is scheduled for surgery and the blood bank is short of this group. Any help is deeply appreciated.',
  'Emergency admission after an accident. The hospital has asked us to arrange donors urgently.',
  'Planned procedure next week. Looking to line up donors in advance so there is no last-minute panic.',
  'Mother is undergoing treatment and needs a transfusion. We will cover all travel costs.',
  'Post-operative requirement. Please reach out if you are available on the given date.',
];

function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function weightedBloodGroup() {
  const total = Object.values(GROUP_WEIGHTS).reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (const [group, weight] of Object.entries(GROUP_WEIGHTS)) {
    r -= weight;
    if (r <= 0) return group;
  }
  return 'O+';
}

function randomDateOfBirth(minAge = 18, maxAge = 55) {
  const age = minAge + Math.floor(rand() * (maxAge - minAge));
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - age);
  d.setUTCMonth(Math.floor(rand() * 12));
  d.setUTCDate(1 + Math.floor(rand() * 28));
  return d;
}

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}
function daysAhead(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  d.setUTCHours(9 + Math.floor(rand() * 8), 0, 0, 0);
  return d;
}

function makePhone(i) {
  return `+91 9${String(800000000 + i * 1234567).slice(0, 9)}`;
}

async function seedDonors(passwordHash) {
  const donors = [];
  const TOTAL = 84;

  for (let i = 0; i < TOTAL; i += 1) {
    const place = CITIES[i % CITIES.length];
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = pick(LAST_NAMES);
    const name = `${first} ${last}`;
    const email = `donor${i + 1}@${DEMO_EMAIL_DOMAIN}`;
    const bloodGroup = weightedBloodGroup();

    // ~72% of donors are currently available, mirroring a live platform.
    const available = rand() > 0.28;
    // Donors who gave recently are temporarily ineligible, which the profile
    // surfaces through the eligibility indicator.
    const gaveRecently = rand() > 0.62;
    const lastDonationDate = gaveRecently ? daysAgo(5 + Math.floor(rand() * 70)) : daysAgo(120 + Math.floor(rand() * 500));
    const neverDonated = rand() > 0.85;

    const user = await User.create({
      name,
      email,
      phone: makePhone(i),
      passwordHash,
      role: 'donor',
    });

    const profile = await DonorProfile.create({
      user: user._id,
      donorName: name,
      bloodGroup,
      dateOfBirth: randomDateOfBirth(),
      gender: rand() > 0.45 ? 'male' : 'female',
      lastDonationDate: neverDonated ? null : lastDonationDate,
      isFirstTimeDonor: neverDonated,
      totalDonations: neverDonated ? 0 : 1 + Math.floor(rand() * 18),
      available,
      availableAgainOn: available ? null : daysAhead(7 + Math.floor(rand() * 30)),
      location: {
        type: 'Point',
        coordinates: [jitter(place.lng, place.spread), jitter(place.lat, place.spread)],
      },
      city: place.city,
      state: place.state,
      country: place.country,
      areaLabel: `${pick(AREAS[place.city])}, ${place.city}`,
      preferredContactMethod: pick(['phone', 'email', 'in_app']),
      bio: rand() > 0.35 ? pick(BIOS) : null,
    });

    user.profile = profile._id;
    await user.save();
    donors.push({ user, profile, place });
  }
  return donors;
}

async function seedRequests(donors) {
  const seekerNames = ['Priya Menon', 'Rakesh Iyer', 'Sunita Deshmukh', 'Anil Kapoor', 'Meena Rao'];
  const requests = [];

  // Two standing demo seeker accounts plus per-request seekers.
  for (let i = 0; i < 5; i += 1) {
    const name = seekerNames[i];
    const email = `seeker${i + 1}@${DEMO_EMAIL_DOMAIN}`;
    const user = await User.create({
      name,
      email,
      phone: makePhone(200 + i),
      passwordHash: await User.hashPassword(DEMO_PASSWORD),
      role: 'seeker',
    });

    const place = CITIES[i % CITIES.length];
    const request = await BloodRequest.create({
      requester: user._id,
      patientName: pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES),
      bloodGroup: weightedBloodGroup(),
      unitsRequired: 1 + Math.floor(rand() * 3),
      hospitalName: pick(HOSPITALS),
      location: {
        type: 'Point',
        coordinates: [jitter(place.lng, place.spread * 0.4), jitter(place.lat, place.spread * 0.4)],
      },
      city: place.city,
      state: place.state,
      country: place.country,
      locationNote: `${pick(AREAS[place.city])} branch`,
      requiredAt: daysAhead(1 + Math.floor(rand() * 10)),
      urgency: pick(['low', 'normal', 'normal', 'high', 'critical']),
      message: pick(REQUEST_MESSAGES),
      contactPhone: makePhone(200 + i),
      status: 'pending',
    });
    requests.push({ user, request });
  }

  // A few historical requests so status filters have real data.
  for (let i = 0; i < 4; i += 1) {
    const place = CITIES[(i + 2) % CITIES.length];
    const user = requests[i % requests.length].user;
    const status = i % 2 === 0 ? 'fulfilled' : 'cancelled';
    await BloodRequest.create({
      requester: user._id,
      patientName: pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES),
      bloodGroup: weightedBloodGroup(),
      unitsRequired: 2,
      unitsFulfilled: status === 'fulfilled' ? 2 : 0,
      hospitalName: pick(HOSPITALS),
      location: {
        type: 'Point',
        coordinates: [jitter(place.lng, place.spread * 0.4), jitter(place.lat, place.spread * 0.4)],
      },
      city: place.city,
      state: place.state,
      country: place.country,
      requiredAt: daysAgo(3 + i),
      urgency: 'normal',
      message: pick(REQUEST_MESSAGES),
      status,
      fulfilledAt: status === 'fulfilled' ? daysAgo(2 + i) : null,
      cancelledAt: status === 'cancelled' ? daysAgo(1 + i) : null,
    });
  }

  // Seed a couple of responses on the first request so the flow is visible.
  const first = await BloodRequest.findById(requests[0].request._id);
  const nearbyDonors = donors.slice(0, 3);
  first.responses = nearbyDonors.map((d, idx) => ({
    donor: d.profile._id,
    user: d.user._id,
    status: idx === 0 ? 'accepted' : idx === 1 ? 'declined' : 'invited',
    note: idx === 0 ? 'Available, will reach the hospital by 9am.' : null,
    respondedAt: idx === 0 || idx === 1 ? daysAgo(idx) : null,
  }));
  first.status = 'accepted';
  await first.save();

  return requests;
}

async function destroy() {
  const users = await User.find({ email: new RegExp(`@${DEMO_EMAIL_DOMAIN.replace('.', '\\.')}$`) }).select('_id');
  const ids = users.map((u) => u._id);
  const reqs = await BloodRequest.deleteMany({ requester: { $in: ids } });
  const profiles = await DonorProfile.deleteMany({ user: { $in: ids } });
  const removed = await User.deleteMany({ _id: { $in: ids } });
  logger.info(`Removed ${removed.deletedCount} demo users, ${profiles.deletedCount} donor profiles, ${reqs.deletedCount} requests`);
}

async function run() {
  const args = process.argv.slice(2);
  await connect();

  if (args.includes('--destroy')) {
    await destroy();
    await disconnect();
    return;
  }

  const existing = await User.countDocuments({ email: new RegExp(`@${DEMO_EMAIL_DOMAIN.replace('.', '\\.')}$`) });
  if (existing > 0) {
    logger.info('Demo data already present — removing it before re-seeding');
    await destroy();
  }

  const passwordHash = await User.hashPassword(DEMO_PASSWORD);
  const donors = await seedDonors(passwordHash);
  await seedRequests(donors);

  // Indexes must exist for the geospatial queries to work.
  await Promise.all([User.syncIndexes(), DonorProfile.syncIndexes(), BloodRequest.syncIndexes()]);

  const available = await DonorProfile.countDocuments({ available: true });
  logger.info('Seed complete.');
  logger.info(`  Donors:            ${donors.length} (${available} currently available)`);
  logger.info(`  Blood requests:    ${await BloodRequest.countDocuments()}`);
  logger.info(`  Demo password:     ${DEMO_PASSWORD}  (all @${DEMO_EMAIL_DOMAIN} accounts)`);
  logger.info(`  Example donor:     donor1@${DEMO_EMAIL_DOMAIN}`);
  logger.info(`  Example seeker:    seeker1@${DEMO_EMAIL_DOMAIN}`);
  logger.info('  NOTE: all data is fictional and for development only.');

  await disconnect();
}

run().catch(async (err) => {
  logger.error('Seed failed', err);
  await disconnect().catch(() => {});
  process.exit(1);
});
