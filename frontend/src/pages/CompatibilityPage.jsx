import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { BloodGroupBadge } from '../components/ui/Badge';
import { BLOOD_GROUPS, DONOR_TO_RECIPIENT, RECIPIENT_FROM_DONOR } from '../utils/format';

/**
 * Blood group compatibility reference.
 *
 * Medically standard ABO/Rh red-cell compatibility, presented as general
 * guidance with an explicit note that the hospital or blood bank makes the
 * final call. No invented or simplified-away information.
 */
export default function CompatibilityPage() {
  return (
    <div className="mx-auto max-w-content px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Blood group compatibility
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">
          Which red-cell groups can be given to, and received from, each blood group. This is general ABO/Rh guidance.
          Plasma, platelets and other components follow different rules, and the hospital or blood bank always
          confirms what is appropriate for a specific patient.
        </p>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Universal donor</p>
          <div className="mt-2 flex items-center gap-3">
            <BloodGroupBadge group="O-" />
            <p className="text-sm text-ink-600">O- red cells can be given to every blood group.</p>
          </div>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Universal recipient</p>
          <div className="mt-2 flex items-center gap-3">
            <BloodGroupBadge group="AB+" />
            <p className="text-sm text-ink-600">AB+ can receive red cells from every blood group.</p>
          </div>
        </div>
      </div>

      {/* Donor -> recipient */}
      <section className="mt-10" aria-labelledby="donate-to-heading">
        <h2 id="donate-to-heading" className="text-lg font-semibold text-ink-900">
          If a donor has this group, they can donate to
        </h2>
        <p className="mt-1 text-sm text-ink-500">Read each row as: "a donor with this group can give red cells to…"</p>

        <div className="mt-4 overflow-hidden rounded-xl border border-ink-200 bg-white">
          <table className="w-full text-sm">
            <caption className="sr-only">Donor blood group and the recipient groups they can donate to</caption>
            <thead className="bg-ink-50 text-left">
              <tr>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Donor group
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Can donate red cells to
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {BLOOD_GROUPS.map((group) => (
                <tr key={group}>
                  <th scope="row" className="whitespace-nowrap px-4 py-3 text-left align-top">
                    <BloodGroupBadge group={group} size="sm" />
                  </th>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {DONOR_TO_RECIPIENT[group].map((recipient) => (
                        <BloodGroupBadge key={recipient} group={recipient} size="sm" />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recipient <- donor */}
      <section className="mt-10" aria-labelledby="receive-from-heading">
        <h2 id="receive-from-heading" className="text-lg font-semibold text-ink-900">
          If a patient has this group, they can receive from
        </h2>
        <p className="mt-1 text-sm text-ink-500">Read each row as: "a patient with this group can receive red cells from…"</p>

        <div className="mt-4 overflow-hidden rounded-xl border border-ink-200 bg-white">
          <table className="w-full text-sm">
            <caption className="sr-only">Recipient blood group and the donor groups they can receive from</caption>
            <thead className="bg-ink-50 text-left">
              <tr>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Patient group
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Can receive red cells from
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {BLOOD_GROUPS.map((group) => (
                <tr key={group}>
                  <th scope="row" className="whitespace-nowrap px-4 py-3 text-left align-top">
                    <BloodGroupBadge group={group} size="sm" />
                  </th>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {RECIPIENT_FROM_DONOR[group].map((donor) => (
                        <BloodGroupBadge key={donor} group={donor} size="sm" />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-amber-900">Important</h2>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-amber-900">
          <li>This chart covers red blood cells only and does not account for your medical history or antibodies.</li>
          <li>Rh-negative patients, and some others, may need closer matching than this table shows.</li>
          <li>Never use this page to make a medical decision. Your hospital or blood bank determines compatibility.</li>
          <li>In an emergency, contact your hospital or local blood bank directly.</li>
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button as="link" to="/search" variant="primary">
          Find donors near me
        </Button>
        <Button as="link" to="/register" variant="secondary">
          Become a donor
        </Button>
      </div>

      <p className="mt-6 text-xs text-ink-400">
        Looking for a donor with a specific group?{' '}
        <Link to="/search" className="link">
          Search by blood group and distance
        </Link>
        .
      </p>
    </div>
  );
}
