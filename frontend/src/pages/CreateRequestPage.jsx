import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import LocationPicker from '../components/ui/LocationPicker';
import { BloodGroupBadge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { requestApi } from '../services/endpoints';
import { BLOOD_GROUPS, URGENCY_OPTIONS, toDateTimeLocalValue } from '../utils/format';
import {
  validateName,
  validateBloodGroup,
  validateUnits,
  validateFutureDate,
  validateCoordinates,
  validateRequired,
  validatePhone,
} from '../utils/validation';

const EMPTY = {
  patientName: '',
  bloodGroup: '',
  unitsRequired: 1,
  hospitalName: '',
  city: '',
  state: '',
  country: '',
  latitude: null,
  longitude: null,
  areaLabel: '',
  requiredAt: toDateTimeLocalValue(),
  urgency: 'normal',
  message: '',
  contactPhone: '',
};

/** Create a blood request. On success we show the compatible donors found. */
export default function CreateRequestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const prefill = location.state?.prefill;
  const [values, setValues] = useState({
    ...EMPTY,
    bloodGroup: prefill?.bloodGroup || '',
    city: prefill?.city || '',
    state: prefill?.state || '',
    country: prefill?.country || '',
    areaLabel: prefill?.areaLabel || '',
    contactPhone: user?.phone || '',
    patientName: user?.name || '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [matches, setMatches] = useState(null);
  const [createdId, setCreatedId] = useState(null);

  const setField = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const setLocation = (next) => {
    setValues((prev) => ({ ...prev, ...next }));
    setErrors((prev) => ({ ...prev, latitude: undefined, city: undefined }));
  };

  const validate = () => {
    const next = {
      patientName: validateName(values.patientName),
      bloodGroup: validateBloodGroup(values.bloodGroup),
      unitsRequired: validateUnits(values.unitsRequired),
      hospitalName: validateRequired(values.hospitalName, 'Hospital name'),
      city: validateRequired(values.city, 'City'),
      country: validateRequired(values.country, 'Country'),
      latitude: validateCoordinates(values.latitude, values.longitude),
      requiredAt: validateFutureDate(values.requiredAt, 'Required date'),
      contactPhone: values.contactPhone ? validatePhone(values.contactPhone) : null,
    };
    return Object.fromEntries(Object.entries(next).filter(([, v]) => v));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const data = await requestApi.create({
        patientName: values.patientName.trim(),
        bloodGroup: values.bloodGroup,
        unitsRequired: Number(values.unitsRequired),
        hospitalName: values.hospitalName.trim(),
        city: values.city.trim(),
        state: values.state.trim() || null,
        country: values.country.trim(),
        latitude: values.latitude,
        longitude: values.longitude,
        locationNote: values.areaLabel.trim() || null,
        requiredAt: new Date(values.requiredAt).toISOString(),
        urgency: values.urgency,
        message: values.message.trim() || null,
        contactPhone: values.contactPhone.trim() || null,
      });

      setCreatedId(data.request.id);
      setMatches(data.matches || []);
      toast.success('Your blood request has been created.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err.details) setErrors(err.details);
      else setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Success view: show the real matches the API returned ----
  if (createdId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm4 6.2-4.7 4.7a.75.75 0 0 1-1.06 0L6 10.1l1.06-1.06 1.7 1.7 4.18-4.18L14 7.7Z" />
              </svg>
            </span>
            <div>
              <h1 className="text-lg font-semibold text-ink-900">Your request is live</h1>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">
                Compatible donors near the hospital can now see it. You will be able to see their contact details
                once they accept.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => navigate(`/requests/${createdId}`)}>
              View request
            </Button>
            <Button variant="secondary" onClick={() => navigate('/requests?scope=mine')}>
              My requests
            </Button>
          </div>
        </div>

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-ink-900">
            {matches.length > 0
              ? `${matches.length} compatible donor${matches.length === 1 ? '' : 's'} found nearby`
              : 'No compatible donors found nearby yet'}
          </h2>

          {matches.length > 0 ? (
            <>
              <p className="mt-1 text-xs text-ink-500">
                These donors can help with a {values.bloodGroup} patient. Distances are from the hospital location.
              </p>
              <ul className="mt-4 divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-200 bg-white">
                {matches.map((match) => (
                  <li key={match.id} className="flex items-center gap-3 p-3.5">
                    <BloodGroupBadge group={match.bloodGroup} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-800">{match.name}</p>
                      <p className="truncate text-xs text-ink-500">
                        {match.areaLabel || match.city} · {match.distanceKm} km away
                        {match.exactMatch && <span className="ml-1 text-emerald-700">· exact group match</span>}
                      </p>
                    </div>
                    <Button as="link" to={`/donors/${match.id}`} variant="secondary" size="sm">
                      View
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 rounded-lg border border-ink-200 bg-ink-50 p-3 text-sm text-ink-600">
              Nobody compatible was found within 50 km right now. Your request stays open — donors can still find it,
              and you can widen the search from the request page.
            </p>
          )}
        </section>
      </div>
    );
  }

  // ---- Form ----
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Create a blood request</h1>
        <p className="mt-1.5 text-sm text-ink-600">
          Tell us what is needed and where. Lifeline will show it to compatible donors near the hospital.
        </p>
      </header>

      {formError && (
        <div className="mt-6 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800" role="alert">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6" noValidate>
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink-900">What is needed</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Patient name"
              required
              value={values.patientName}
              onChange={setField('patientName')}
              error={errors.patientName}
              placeholder="Who the blood is for"
            />
            <Input
              label="Units required"
              type="number"
              min="1"
              max="20"
              required
              value={values.unitsRequired}
              onChange={setField('unitsRequired')}
              error={errors.unitsRequired}
              hint="Typically 1 unit per transfusion."
            />
          </div>

          <fieldset className="mt-4">
            <legend className="field-label">
              Blood group required
              <span className="ml-0.5 text-brand-600" aria-hidden="true">
                *
              </span>
            </legend>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Blood group required">
              {BLOOD_GROUPS.map((group) => {
                const selected = values.bloodGroup === group;
                return (
                  <button
                    key={group}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setValues((prev) => ({ ...prev, bloodGroup: group }));
                      setErrors((prev) => ({ ...prev, bloodGroup: undefined }));
                    }}
                    className={`flex items-center justify-center rounded-lg border p-2 transition-colors ${
                      selected ? 'border-brand-500 bg-brand-50' : 'border-ink-200 bg-white hover:border-ink-300'
                    }`}
                  >
                    <BloodGroupBadge group={group} size="sm" />
                  </button>
                );
              })}
            </div>
            {errors.bloodGroup && <p className="field-error">{errors.bloodGroup}</p>}
            {values.bloodGroup && (
              <p className="field-hint">
                Lifeline will also include donors whose blood is compatible with {values.bloodGroup}, not just exact
                matches.
              </p>
            )}
          </fieldset>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Required by"
              type="datetime-local"
              required
              value={values.requiredAt}
              onChange={setField('requiredAt')}
              error={errors.requiredAt}
            />
            <Select
              label="Urgency"
              options={URGENCY_OPTIONS}
              value={values.urgency}
              onChange={setField('urgency')}
              hint="Critical requests are shown first to nearby donors."
            />
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink-900">Where</h2>
          <div className="mt-4 space-y-4">
            <Input
              label="Hospital or blood bank"
              required
              value={values.hospitalName}
              onChange={setField('hospitalName')}
              error={errors.hospitalName}
              placeholder="e.g. City General Hospital"
            />
            <LocationPicker
              value={values}
              onChange={setLocation}
              error={errors.latitude || errors.city}
              required
              label="Hospital location"
              hint="Used to find donors near the hospital. Shown to donors as an approximate area."
            />
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink-900">Details for donors</h2>
          <Textarea
            containerClassName="mt-4"
            label="Message (optional)"
            value={values.message}
            onChange={setField('message')}
            maxLength={600}
            rows={4}
            placeholder="e.g. Surgery scheduled on Tuesday morning. Blood bank is short of this group."
            hint="Do not include sensitive medical details. Keep it to what a donor needs to know."
          />
          <Input
            containerClassName="mt-4"
            label="Contact number for donors (optional)"
            type="tel"
            value={values.contactPhone}
            onChange={setField('contactPhone')}
            error={errors.contactPhone}
            hint="Shown only to donors who accept this request."
          />
        </section>

        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          <strong className="font-semibold">Before you post:</strong> for medical emergencies, contact your hospital or
          local blood bank first. Lifeline helps you coordinate donors; it does not provide blood or medical advice.
        </p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="lg" loading={submitting}>
            Create request
          </Button>
        </div>
      </form>
    </div>
  );
}
