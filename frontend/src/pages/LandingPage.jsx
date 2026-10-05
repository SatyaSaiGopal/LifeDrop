import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { BloodGroupBadge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { donorApi } from '../services/endpoints';
import { BLOOD_GROUPS, DONOR_TO_RECIPIENT, RECIPIENT_FROM_DONOR } from '../utils/format';

/**
 * Landing page. Deliberately short: explain the service, let people act, and
 * show only sections that carry real information (how it works, compatibility,
 * privacy, medical scope).
 */
export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const stats = useAsyncResource(() => donorApi.stats(), []);

  const totalDonors = stats.data?.total ?? null;
  const availableDonors = stats.data?.available ?? null;
  const cityCount = stats.data?.cityCount ?? null;

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="border-b border-ink-200 bg-white">
        <div className="mx-auto max-w-content px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
                Donor discovery and coordination
              </p>

              <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
                Find the right blood donor when it matters.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-600 sm:text-lg">
                Search verified donors near you by blood group and distance, or register as a donor so people nearby
                can reach you. Every donor on Lifeline controls their own availability and contact preference.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button as="link" to="/search" size="lg" variant="primary">
                  Find donors near me
                </Button>
                {isAuthenticated ? (
                  <Button as="link" to="/requests/new" size="lg" variant="secondary">
                    Create a blood request
                  </Button>
                ) : (
                  <Button as="link" to="/register" size="lg" variant="secondary">
                    Become a donor
                  </Button>
                )}
              </div>

              {/* Real counts from the database; the section is hidden until loaded. */}
              {totalDonors !== null && totalDonors > 0 && (
                <dl className="mt-9 flex flex-wrap gap-x-8 gap-y-3 border-t border-ink-100 pt-6">
                  <Stat label="Registered donors" value={totalDonors} />
                  <Stat label="Available now" value={availableDonors} />
                  <Stat label="Cities covered" value={cityCount} />
                </dl>
              )}
            </div>

            {/* A compact, purposeful compatibility preview. */}
            <div className="rounded-2xl border border-ink-200 bg-ink-50 p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-ink-900">Who can donate to whom</h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">
                General ABO/Rh guidance. Your hospital or blood bank confirms what is safe for a specific patient.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-ink-200 bg-white p-3">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">Universal donor</p>
                  <div className="mt-2 flex items-center gap-2">
                    <BloodGroupBadge group="O-" />
                    <span className="text-xs text-ink-600">Red cells for all groups</span>
                  </div>
                </div>
                <div className="rounded-lg border border-ink-200 bg-white p-3">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">Universal recipient</p>
                  <div className="mt-2 flex items-center gap-2">
                    <BloodGroupBadge group="AB+" />
                    <span className="text-xs text-ink-600">Can receive from all groups</span>
                  </div>
                </div>
              </div>

              <Link
                to="/compatibility"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
              >
                See the full compatibility chart
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                  <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="border-b border-ink-200 bg-ink-50 py-14 sm:py-16">
        <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-ink-900">How Lifeline works</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
            Three steps, whether you need blood or want to give it.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <Step
              number="1"
              title="Search by location and blood group"
              body="Share your location or type a city, pick a blood group and a radius. Lifeline ranks donors by distance and shows who is available right now."
            />
            <Step
              number="2"
              title="Raise a request if you need blood"
              body="Create a request with the hospital, units needed and how urgent it is. Lifeline finds compatible donors near the hospital so you are not calling around."
            />
            <Step
              number="3"
              title="Donors respond directly"
              body="Donors see requests that match their group and distance, and accept or decline. Contact details are shared only once a donor accepts."
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button as="link" to="/search" variant="primary">
              Start a search
            </Button>
            {!user?.profile && (
              <Button as="link" to="/register" variant="secondary">
                Register as a donor
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- Privacy ---------------- */}
      <section className="border-b border-ink-200 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-ink-900">Privacy is built in</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Blood donation is health information. Lifeline is designed so that helping someone does not mean
                giving up your privacy.
              </p>
              <ul className="mt-6 space-y-3.5">
                <PrivacyPoint title="No exact home addresses">
                  Donor locations are shown as an approximate area on the map. The precise coordinates used to
                  calculate distance are never published.
                </PrivacyPoint>
                <PrivacyPoint title="Contact only when it matters">
                  A donor's phone number or email is released only after they accept a request. Until then, you
                  coordinate through the request.
                </PrivacyPoint>
                <PrivacyPoint title="You control your availability">
                  Donors can switch to unavailable at any time, and immediately disappear from searches that ask for
                  available donors.
                </PrivacyPoint>
              </ul>
            </div>

            <div className="rounded-2xl border border-ink-200 bg-ink-50 p-6">
              <h3 className="text-sm font-semibold text-ink-900">What Lifeline is not</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Lifeline is not a hospital, blood bank or emergency service. It does not decide whether you can
                donate or receive blood.
              </p>
              <ul className="mt-4 space-y-2.5 text-sm text-ink-600">
                <li className="flex gap-2.5">
                  <CheckIcon />
                  <span>In an emergency, contact your hospital or local blood bank first.</span>
                </li>
                <li className="flex gap-2.5">
                  <CheckIcon />
                  <span>Donation eligibility is confirmed by the collecting blood bank.</span>
                </li>
                <li className="flex gap-2.5">
                  <CheckIcon />
                  <span>Compatibility information here is general guidance only.</span>
                </li>
              </ul>
              <div className="mt-5 border-t border-ink-200 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">All blood groups supported</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {BLOOD_GROUPS.map((group) => (
                    <BloodGroupBadge key={group} group={group} size="sm" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Final CTA ---------------- */}
      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-ink-200 bg-ink-900 px-6 py-10 text-center sm:px-12 sm:py-14">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Someone nearby may be able to help today.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink-300">
              Whether you need donors or want to be one, it takes a minute to start.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button as="link" to="/search" size="lg" variant="primary">
                Find donors
              </Button>
              <Button
                as="link"
                to={isAuthenticated ? '/requests/new' : '/register'}
                size="lg"
                variant="secondary"
                className="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20"
              >
                {isAuthenticated ? 'Create a blood request' : 'Register as a donor'}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-xl font-bold tabular-nums text-ink-900">{value}</dd>
    </div>
  );
}

function Step({ number, title, body }) {
  return (
    <div className="card p-5">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
        {number}
      </span>
      <h3 className="mt-3.5 text-sm font-semibold text-ink-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{body}</p>
    </div>
  );
}

function PrivacyPoint({ title, children }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor" aria-hidden="true">
          <path d="M6 0a6 6 0 1 0 0 12A6 6 0 0 0 6 0Zm2.8 4.6L5.6 7.8 3.7 6l.8-.8 1.1 1.1 2.4-2.4.8.7Z" />
        </svg>
      </span>
      <span>
        <span className="block text-sm font-semibold text-ink-800">{title}</span>
        <span className="mt-0.5 block text-sm leading-relaxed text-ink-600">{children}</span>
      </span>
    </li>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" fill="currentColor" aria-hidden="true">
      <path d="M6.2 11.3 2.9 8l-1.1 1.1 4.4 4.4 8-8-1.1-1.1-6.9 6.9Z" />
    </svg>
  );
}

/** Re-exported for the compatibility page so the data lives in one place. */
export { DONOR_TO_RECIPIENT, RECIPIENT_FROM_DONOR };
