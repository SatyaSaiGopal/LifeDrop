# Lifeline

A blood donor discovery and coordination platform. People who need blood can find
compatible donors nearby; people who can give blood can register, stay in control of
their availability, and respond to requests that match their blood group and distance.

This is a working application, not a mockup. Every visible control performs a real
action backed by the API and the database.

---

## Table of contents

- [Product overview](#product-overview)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Folder structure](#folder-structure)
- [Environment variables](#environment-variables)
- [MongoDB setup](#mongodb-setup)
- [Installation](#installation)
- [Seed the database](#seed-the-database)
- [Run the app](#run-the-app)
- [Testing](#testing)
- [API overview](#api-overview)
- [How geolocation works](#how-geolocation-works)
- [Privacy model](#privacy-model)
- [Production considerations](#production-considerations)
- [Medical disclaimer](#medical-disclaimer)

---

## Product overview

Lifeline solves one problem: **finding a suitable blood donor quickly, without
sacrificing anyone's privacy.**

Two roles use the platform:

- **Donors** register a profile (blood group, location, availability, donation history)
  and can be found by people nearby. They accept or decline requests, and control
  whether they are currently available.
- **Seekers** search for donors by blood group, location and radius — or raise a blood
  request that is shown to compatible donors near the hospital.

Contact details are never exposed in search results. They are released only after a
donor accepts a request, in either direction.

---

## Features

**Donor discovery**
- Radius search using MongoDB `$geoNear` over a `2dsphere` index (5 / 10 / 25 / 50 km)
- Blood group filter (all eight groups) and availability filter
- Distance calculated and sorted by the database, returned in kilometres
- Sort by nearest or recently active
- Optional map view (Leaflet + OpenStreetMap) with approximate donor markers, synced
  to the result cards
- Text search across donor name, area, city and state
- City autocomplete with live donor counts, derived from actual data

**Accounts and authentication**
- Registration and login with JWT in an httpOnly cookie (bearer token supported for
  non-browser clients)
- Passwords hashed with bcrypt (cost 12); never returned by any endpoint
- Persistent sessions with a session-expiry notice on 401
- Protected routes with a loading state, so a refresh never flashes the login page
- No user enumeration: identical error for unknown email and wrong password

**Donor profiles**
- Public profile showing name, blood group, approximate area, distance, availability,
  last donation and a general eligibility indicator
- Profile management for name, phone, blood group, location, availability, last
  donation, contact preference and bio
- Availability toggle that immediately changes search visibility
- ABO/Rh compatibility shown on the profile and on a dedicated guide page

**Blood requests**
- Create a request with patient name, blood group, units, hospital, location,
  required date/time, urgency, message and contact number
- The API returns compatible nearby donors immediately on creation
- Donors accept or decline; responses are idempotent (one entry per donor)
- Status lifecycle: `pending` → `accepted` → `fulfilled`, or `cancelled`
- Owner can edit an open request, mark it fulfilled, or cancel it (with confirmation)
- Contact details revealed to the requester once a donor accepts, and to that donor

**Dashboard**
- For donors: nearby compatible requests, requests they responded to, donor status,
  profile-completeness prompts
- For seekers: their requests, matching donors for an open request
- Action-oriented; no decorative metrics

**Platform**
- Loading skeletons, empty states with real next actions, and error states with retry
- Client and server validation, with field-level errors from the API
- Rate limiting on auth and write endpoints
- Centralised error handling; no stack traces in production
- Responsive layouts designed separately for mobile, tablet and desktop
- Accessibility: semantic HTML, skip link, visible focus states, keyboard-navigable
  modals with focus trapping, ARIA-labelled controls, errors linked via
  `aria-describedby`, status never conveyed by colour alone

---

## Tech stack

**Frontend**
- React 18 (function components and hooks)
- React Router 6
- Tailwind CSS 3
- Leaflet / react-leaflet (lazy-loaded, optional)
- Vite

**Backend**
- Node.js + Express 4
- MongoDB + Mongoose 8 (with geospatial queries)
- Zod for request validation
- JWT (`jsonwebtoken`) + bcryptjs
- helmet, cors, express-rate-limit, express-mongo-sanitize, compression

No library is included without a functional purpose. There is no state-management
library (React context + hooks are sufficient), no CSS-in-JS runtime, and no charting
library (there are no charts to draw).

---

## Architecture

```
Browser (React SPA)
   │  fetch, credentials: 'include'
   ▼
Vite dev server ──proxy──► Express API (:5000)
   │                          │
   │                          ├── middleware: helmet, cors, rate limit,
   │                          │   mongo-sanitize, cookie parser, auth
   │                          ├── validators: Zod schemas → 400 with field details
   │                          ├── controllers: HTTP concerns only
   │                          ├── services: business logic + privacy serializers
   │                          └── models: Mongoose schemas + indexes
   ▼                          ▼
Leaflet / OSM tiles       MongoDB (2dsphere index on donor location)
```

**Key design decisions**

- **The URL is the search state.** Filters, radius, blood group and search centre live
  in query parameters, so searches are shareable, bookmarkable and the browser back
  button behaves correctly.
- **Geospatial work happens in the database.** `$geoNear` filters by radius, computes
  distance and sorts — the API never loads a collection to filter it in JavaScript.
- **Privacy is enforced in one place.** Every payload passes through
  `services/privacy.js`, which is the only code that decides what another user may
  see. Adding a field to a schema does not leak it automatically.
- **Errors are shaped once.** Controllers throw `ApiError`; a single error middleware
  translates Mongoose, Mongo and Multer errors into the standard envelope.
- **Optional dependencies degrade gracefully.** The map is lazy-loaded and can be
  disabled with `VITE_MAP_ENABLED=false`; donor results, distances and filters keep
  working. Geocoding falls back to the API's donor-city list if Nominatim is
  unreachable.

---

## Folder structure

```
fsd_project/
├── backend/
│   ├── scripts/
│   │   ├── seed.js                 # development seed data (fictional)
│   │   └── verify.js               # boots the app and prints a live smoke report
│   ├── tests/
│   │   └── run.js                  # end-to-end API suite (in-memory MongoDB)
│   └── src/
│       ├── config/
│       │   ├── env.js              # validated configuration
│       │   └── db.js               # Mongoose connection
│       ├── controllers/            # auth, donor, request, dashboard
│       ├── middleware/             # auth, error handler, rate limits, uploads
│       ├── models/                 # User, DonorProfile, BloodRequest
│       ├── routes/                 # REST route definitions
│       ├── services/               # donor search, requests, privacy, tokens
│       ├── utils/                  # ApiError, http helpers, constants, eligibility
│       ├── validators/             # Zod schemas + validation middleware
│       ├── app.js                  # Express app assembly
│       └── server.js               # bootstrap + graceful shutdown
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── donor/              # DonorCard, SearchFilters, DonorMap, RequestCard…
    │   │   ├── feedback/           # Loading / Empty / Error states, ToastViewport
    │   │   ├── layout/             # Navbar, Footer
    │   │   ├── routing/            # ProtectedRoute
    │   │   └── ui/                 # Button, Input, Select, Modal, Badge, Avatar…
    │   ├── context/                # AuthContext, ToastContext
    │   ├── hooks/                  # useGeolocation, useAsyncResource, useDebouncedValue
    │   ├── layouts/                # MainLayout
    │   ├── pages/                  # one file per route
    │   ├── routes/                 # route table with lazy loading
    │   ├── services/               # api client, endpoints, geocoding
    │   └── utils/                  # format helpers, validation rules
    └── index.html
```

---

## Environment variables

### Backend — copy `backend/.env.example` to `backend/.env`

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | Enables production hardening when set to `production` |
| `PORT` | no | `5000` | API port |
| `MONGODB_URI` | **yes** | `mongodb://127.0.0.1:27017/lifeline` | MongoDB connection string |
| `JWT_SECRET` | **yes in prod** | insecure dev fallback | Token signing secret |
| `JWT_EXPIRES_IN` | no | `7d` | Session lifetime |
| `CLIENT_URL` | no | `http://localhost:5173` | Allowed CORS origins, comma-separated |
| `UPLOAD_DRIVER` | no | `local` | Profile photo storage |
| `MAX_UPLOAD_MB` | no | `2` | Upload size limit |
| `DEFAULT_SEARCH_RADIUS_KM` | no | `25` | Default search radius |
| `MAX_SEARCH_RADIUS_KM` | no | `100` | Hard cap on radius |
| `DONOR_MIN_AGE` / `DONOR_MAX_AGE` | no | `18` / `65` | Age guidance for the eligibility indicator |

> **Note on `CLIENT_URL`:** a browser treats `localhost` and `127.0.0.1` as different
> origins. If you open the app under both hostnames, list both, comma-separated.

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Frontend — copy `frontend/.env.example` to `frontend/.env`

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | API base. `/api` uses the Vite proxy (single origin, cookies just work) |
| `VITE_MAP_ENABLED` | `true` | Set `false` to disable the map entirely |
| `VITE_PROXY_TARGET` | `http://localhost:5000` | Dev proxy target |

**No API key is required.** The map uses OpenStreetMap raster tiles and place search
uses Nominatim. Both are keyless. If you deploy at scale you should self-host tiles or
use a paid provider (Mapbox, MapTiler) — see [Production considerations](#production-considerations).

---

## MongoDB setup

**Local installation**

```bash
# macOS (Homebrew)
brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community

# Ubuntu
sudo systemctl start mongod

# Windows — run mongod with a data directory
mongod --dbpath C:\data\db
```

**Docker (no local install)**

```bash
docker run -d --name lifeline-mongo -p 27017:27017 mongo:7
```

**MongoDB Atlas**

Create a free cluster, add a database user, allow your IP, then:

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/lifeline?retryWrites=true&w=majority
```

Indexes are created automatically on startup outside production (`autoIndex`). In
production, build them explicitly after deploy — the critical one is the geospatial
index, without which radius search will not work:

```js
db.donorprofiles.createIndex({ location: "2dsphere" })
db.donorprofiles.createIndex({ bloodGroup: 1, available: 1 })
db.bloodrequests.createIndex({ location: "2dsphere" })
```

---

## Installation

Requires Node.js 18+ and a running MongoDB.

```bash
# Backend
cd backend
cp .env.example .env        # then set MONGODB_URI and JWT_SECRET
npm install

# Frontend
cd ../frontend
cp .env.example .env
npm install
```

---

## Seed the database

The seed script inserts **84 fictional donors** across six cities with a realistic
blood-group distribution, plus nine blood requests in various states.

```bash
cd backend
npm run seed            # insert demo data (safe to re-run; replaces prior demo data)
npm run seed:destroy    # remove all demo data
```

All demo accounts use the password **`Demo@1234`**:

| Account | Email |
| --- | --- |
| Donor | `donor1@demo.lifeline.test` |
| Seeker | `seeker1@demo.lifeline.test` |

Every seeded record uses the `@demo.lifeline.test` domain so it can be removed without
touching real data. **All names, emails and phone numbers are fictional.**

---

## Run the app

Two terminals:

```bash
# Terminal 1 — API
cd backend
npm run dev          # nodemon, or: npm start
# → http://localhost:5000

# Terminal 2 — web app
cd frontend
npm run dev
# → http://localhost:5173
```

Open **http://localhost:5173** (or add `http://127.0.0.1:5173` to `CLIENT_URL` if you
prefer that hostname).

Production build:

```bash
cd frontend && npm run build     # outputs to frontend/dist
cd ../backend && NODE_ENV=production npm start
```

---

## Testing

```bash
cd backend
npm test
```

The suite boots an ephemeral MongoDB (`mongodb-memory-server`), starts the real Express
app against it and drives every flow over HTTP. There are no mocks — it exercises the
same code paths a running server uses.

**51 tests** covering:

- Authentication: registration, login, logout, protected routes, duplicate email,
  weak password, no user enumeration, no password leakage
- Geospatial search: radius filtering, distance accuracy, nearest-first ordering,
  blood group and availability filters, empty results, invalid coordinates
- Privacy: no email/phone/date-of-birth/raw coordinates in public payloads; contact
  released only after an accepted request
- Profiles: update, ownership enforcement, invalid values, availability toggle
  affecting search, denormalised name sync, eligibility calculation
- Requests: creation, compatibility of matched donors, accept/decline (idempotent),
  owner-only guards, edit, fulfill, cancel, status transitions, 404/400 handling
- Dashboard: donor and seeker payloads, authentication required

There is also a live smoke report against your configured database:

```bash
cd backend
node scripts/verify.js
```

It prints the actual indexes, seeded population, radius-search results with distances,
a distance-ordering assertion, a privacy check and an auth round-trip.

---

## API overview

Base URL `/api`. Responses use a consistent envelope:

```jsonc
// success
{ "success": true, "data": …, "meta": { "page": 1, "total": 84, … } }

// failure
{ "success": false, "error": { "message": "…", "code": 400, "details": { "email": "…" } } }
```

### Auth

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | — | Register as donor or seeker. Donor fields required when `role=donor` |
| POST | `/auth/login` | — | Sign in; sets the httpOnly session cookie |
| POST | `/auth/logout` | — | Clear the session |
| GET | `/auth/me` | ✔ | Current user and full own profile |

### Donors

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/donors/nearby` | optional | Radius search. `lat`, `lng`, `radius`, `bloodGroup`, `available`, `sort`, `q`, `page`, `limit` |
| GET | `/donors` | optional | List without a location. `bloodGroup`, `city`, `country`, `available`, `q`, `sort` |
| GET | `/donors/cities` | — | Distinct cities with donor counts and a representative coordinate |
| GET | `/donors/stats` | — | Total, available and per-group counts |
| GET | `/donors/:id` | optional | Public donor profile (no contact details) |
| GET | `/donors/:id/contact` | ✔ | Contact details — self, or after an accepted request |
| GET | `/donors/:id/compatibility` | — | Groups this donor can give to / receive from |
| PATCH | `/donors/:id` | ✔ owner | Update own profile |
| PATCH | `/donors/:id/availability` | ✔ owner | Toggle availability |

Example:

```
GET /api/donors/nearby?lat=12.9716&lng=77.5946&radius=10&bloodGroup=O%2B&available=true&sort=distance
```

### Blood requests

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/requests` | ✔ | Create a request; returns compatible nearby donors |
| GET | `/requests` | optional | Feed. `scope=all\|mine\|responded`, `status`, `bloodGroup`, `urgency`, `lat`, `lng`, `radius`, `q` |
| GET | `/requests/:id` | optional | Detail; contact included when permitted |
| GET | `/requests/:id/matches` | ✔ owner | Compatible donors near the request |
| PATCH | `/requests/:id` | ✔ owner | Edit an open request |
| POST | `/requests/:id/respond` | ✔ donor | `{ action: "accept" \| "decline", note? }` |
| POST | `/requests/:id/accept` \| `/decline` | ✔ donor | Convenience wrappers |
| POST | `/requests/:id/cancel` | ✔ owner | Cancel a request |
| POST | `/requests/:id/fulfill` | ✔ owner | Mark the need as met |

### Dashboard

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/dashboard` | ✔ | Role-appropriate, action-oriented payload |

**Status codes:** `200` ok · `201` created · `400` validation · `401` unauthenticated ·
`403` forbidden · `404` not found · `409` conflict · `413` payload too large ·
`429` rate limited · `500` server error.

---

## How geolocation works

1. **Client.** The browser Geolocation API is wrapped in `useGeolocation`, which
   distinguishes permission denied, position unavailable and timeout, and surfaces a
   specific message for each. A denied permission never blocks the flow — the user can
   always search by city instead.

2. **Coordinates.** The browser returns `latitude` and `longitude`. The search centre is
   written into the URL (`?lat=…&lng=…`), making the search shareable.

3. **Storage.** Donor locations are stored as GeoJSON:
   ```js
   location: { type: "Point", coordinates: [longitude, latitude] }
   ```
   Note the GeoJSON order: **longitude first**. Getting this backwards is the most
   common geospatial bug, so it is validated on the schema.

4. **Index.** A `2dsphere` index on `location` makes radius queries index-backed.

5. **Query.** Search uses `$geoNear` inside an aggregation pipeline:
   ```js
   { $geoNear: {
       near: { type: "Point", coordinates: [lng, lat] },
       distanceField: "distanceMeters",
       maxDistance: radiusKm * 1000,
       spherical: true,
       key: "location" } }
   ```
   `$geoNear` must be the first stage. Remaining filters (blood group, availability,
   text) run as `$match` afterwards so they can use their own indexes, and a `$facet`
   returns the page and the total count in one round-trip.

6. **Distance.** `$geoNear` returns metres; the API converts to kilometres once and
   returns `distanceKm` rounded to one decimal.

7. **Matching a request.** Donors whose blood is compatible with the requested group are
   found by `$geoNear` around the hospital, ranked by distance and then by exact-group
   match. Compatibility follows standard ABO/Rh rules (see `utils/constants.js`).

8. **Map.** Leaflet renders approximate markers. The map is lazy-loaded and optional.

---

## Privacy model

Blood donation is health information, so privacy is enforced centrally in
`backend/src/services/privacy.js` — the single place that decides what another user may
see. Public donor payloads contain:

```
id, name, bloodGroup, profilePhoto, city, state, country, areaLabel,
available, availableAgainOn, lastDonationDate, totalDonations, bio,
preferredContactMethod, distanceKm, approxLocation, eligibility, isSelf, updatedAt
```

**Never exposed publicly:** email, phone, date of birth, exact coordinates, password
hash, or the raw Mongo ObjectId.

- Coordinates are coarsened to two decimal places (~1.1 km) for map display; the exact
  value is used only for distance calculation.
- Contact details are released by `GET /donors/:id/contact` only to the donor
  themselves, a requester whose request the donor accepted, or a donor who accepted the
  requester's request.
- The `User` schema declares `passwordHash` with `select: false`, so it is never loaded
  unless explicitly requested, and a `toJSON` transform strips it as a second layer.
- Requests in the public feed carry `contactPhone: null`; it is populated only for the
  owner and for donors who accepted.

---

## Production considerations

- **Secrets.** Set a strong `JWT_SECRET`; the app refuses to start in production without
  one. Never commit `.env`.
- **HTTPS.** Session cookies switch to `secure` and `SameSite=None` when
  `NODE_ENV=production`. Terminate TLS at your proxy and keep `trust proxy` enabled so
  the client IP and protocol are seen correctly.
- **CORS.** Set `CLIENT_URL` to your real frontend origin(s).
- **Indexes.** Set `autoIndex: false` (already the default in production) and build
  indexes during deploy. The `2dsphere` index is mandatory for search.
- **Rate limiting.** Limits are per-process and in-memory. Behind multiple instances,
  move to a shared store (`rate-limit-redis`).
- **Uploads.** The default driver writes to local disk, which does not survive
  container restarts or scale horizontally. Move to S3 or similar for real deployments.
- **Reverse proxy.** Serve the built SPA (`frontend/dist`) from nginx/CDN and proxy
  `/api` to Node. Cache `/uploads` and hashed assets aggressively.
- **Error reporting.** Wire the logger in `utils/logger.js` to your monitoring platform.
  Stack traces are already withheld from production responses.
- **Maps and geocoding.** OpenStreetMap's public tile and Nominatim servers have usage
  policies and are not intended for production traffic. Use a commercial provider or
  self-host, and keep the key server-side where possible.
- **Backups.** Enable MongoDB backups; donor data is not reproducible.

---

## Medical disclaimer

Lifeline is a **donor discovery and coordination platform**. It is not a medical
service.

- It does not diagnose, does not decide who can donate or receive blood, and does not
  replace doctors, hospitals, blood banks or emergency services.
- The eligibility indicator is general guidance based on a 90-day interval between
  whole-blood donations and an age range. The collecting blood bank makes the real
  decision.
- Blood group compatibility information follows standard ABO/Rh red-cell rules and is
  presented as general guidance. It does not account for a patient's antibodies or
  medical history.
- **In an emergency, contact your hospital or local blood bank first.**

Seed data is fictional and intended for development only.
