import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import LocationPicker from '../components/ui/LocationPicker';
import { BloodGroupBadge, AvailabilityBadge } from '../components/ui/Badge';
import { LoadingState } from '../components/feedback/States';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { donorApi } from '../services/endpoints';
import {
  BLOOD_GROUPS,
  GENDER_OPTIONS,
  CONTACT_METHOD_LABELS,
  toDateInputValue,
} from '../utils/format';
import {
  validateName,
  validatePhone,
  validateBloodGroup,
  validateDateOfBirth,
  validatePastDate,
  validateCoordinates,
  validateRequired,
} from '../utils/validation';

const CONTACT_OPTIONS = Object.entries(CONTACT_METHOD_LABELS).map(([value, label]) => ({ value, label }));

/** Convert the authenticated user's profile into editable form values. */
function toFormValues(user) {
  const p = user?.profile;
  if (!p) return null;
  return {
    name: user.name || '',
    phone: user.phone || '',
    bloodGroup: p.bloodGroup || '',
    dateOfBirth: toDateInputValue(p.dateOfBirth),
    gender: p.gender || '',
    city: p.city || '',
    state: p.state || '',
    country: p.country || '',
    latitude: p.location?.coordinates?.[1] ?? null,
    longitude: p.location?.coordinates?.[0] ?? null,
    areaLabel: p.areaLabel || '',
    available: p.available ?? true,
    availableAgainOn: toDateInputValue(p.availableAgainOn),
    lastDonationDate: toDateInputValue(p.lastDonationDate),
    preferredContactMethod: p.preferredContactMethod || 'in_app',
    bio: p.bio || '',
  };
}

/** Donor profile management. Updates go to the API and re-validate server-side. */
export default function ProfilePage() {
  const { user, isReady, updateUser, updateProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  // Initialise once the user is loaded.
  useEffect(() => {
    if (isReady && user && !values) setValues(toFormValues(user));
  }, [isReady, user, values]);

  if (!isReady || !values) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <LoadingState label="Loading your profile…" />
      </div>
    );
  }

  const setField = (field) => (event) => {
    const raw = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues((prev) => ({ ...prev, [field]: raw }));
    setSavedAt(null);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const setLocation = (next) => {
    setValues((prev) => ({ ...prev, ...next }));
    setSavedAt(null);
    setErrors((prev) => ({ ...prev, latitude: undefined, city: undefined }));
  };

  const validate = () => {
    const next = {
      name: validateName(values.name),
      phone: validatePhone(values.phone),
      bloodGroup: validateBloodGroup(values.bloodGroup),
      dateOfBirth: validateDateOfBirth(values.dateOfBirth),
      gender: validateRequired(values.gender, 'Gender'),
      city: validateRequired(values.city, 'City'),
      country: validateRequired(values.country, 'Country'),
      lastDonationDate: validatePastDate(values.lastDonationDate, 'Last donation date'),
      latitude: validateCoordinates(values.latitude, values.longitude),
    };
    return Object.fromEntries(Object.entries(next).filter(([, v]) => v));
  };

  /** Only send fields that actually changed, so the payload is minimal. */
  const buildPayload = () => {
    const original = toFormValues(user);
    const payload = {};
    Object.entries(values).forEach(([key, value]) => {
      if (value === original[key]) return;
      if (key === 'availableAgainOn') {
        payload.availableAgainOn = value || null;
        return;
      }
      if (key === 'lastDonationDate') {
        payload.lastDonationDate = value || null;
        return;
      }
      if (key === 'bio' || key === 'areaLabel') {
        payload[key] = value ? value.trim() : null;
        return;
      }
      if (key === 'name' || key === 'phone' || key === 'city' || key === 'state' || key === 'country') {
        payload[key] = value.trim();
        return;
      }
      payload[key] = value;
    });
    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    const payload = buildPayload();
    if (Object.keys(payload).length === 0) {
      toast.info('Nothing has changed yet.');
      return;
    }

    setSaving(true);
    try {
      const data = await donorApi.update(user.profile.id, payload);
      updateProfile(data.profile);
      if (payload.name) updateUser({ name: payload.name });
      if (payload.phone) updateUser({ phone: payload.phone });
      setSavedAt(new Date());
      toast.success('Your donor profile has been updated.');
    } catch (err) {
      if (err.details) setErrors(err.details);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvailabilityToggle = async () => {
    setTogglingAvailability(true);
    const next = !values.available;
    try {
      const data = await donorApi.setAvailability(user.profile.id, { available: next });
      updateProfile(data.profile);
      setValues((prev) => ({
        ...prev,
        available: data.profile.available,
        availableAgainOn: toDateInputValue(data.profile.availableAgainOn),
      }));
      toast.success(
        next ? 'You are now shown as available to donate.' : 'You are now hidden from searches for available donors.'
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTogglingAvailability(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">My donor profile</h1>
          <p className="mt-1 text-sm text-ink-600">
            Keep this accurate — it is what people see when they search for donors nearby.
          </p>
        </div>
        <Button as="link" to={`/donors/${user.profile.id}`} variant="secondary" size="sm">
          View public profile
        </Button>
      </header>

      {/* Availability: the single most time-sensitive control, so it is first. */}
      <section className="card mt-6 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink-900">Availability</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              When unavailable, you are excluded from searches that filter for available donors. Your profile is still
              visible in an "all donors" search.
            </p>
            <div className="mt-2.5">
              <AvailabilityBadge available={values.available} availableAgainOn={values.availableAgainOn || null} />
            </div>
          </div>
          <Button
            variant={values.available ? 'secondary' : 'success'}
            onClick={handleAvailabilityToggle}
            loading={togglingAvailability}
            className="shrink-0"
          >
            {values.available ? 'Mark as unavailable' : 'Mark as available'}
          </Button>
        </div>

        {!values.available && (
          <div className="mt-4 border-t border-ink-100 pt-4">
            <Input
              label="Available again from (optional)"
              type="date"
              value={values.availableAgainOn}
              onChange={setField('availableAgainOn')}
              hint="Lets people know when you expect to be able to donate again."
            />
          </div>
        )}
      </section>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6" noValidate>
        {/* Account */}
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink-900">Account details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              required
              value={values.name}
              onChange={setField('name')}
              error={errors.name}
            />
            <Input
              label="Phone number"
              type="tel"
              required
              value={values.phone}
              onChange={setField('phone')}
              error={errors.phone}
              hint="Shared only with people you accept a request from."
            />
          </div>
          <Input
            containerClassName="mt-4"
            label="Email address"
            value={user.email}
            disabled
            hint="Your email is used to sign in and cannot be changed here."
          />
        </section>

        {/* Donor details */}
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink-900">Donor details</h2>

          <fieldset className="mt-4">
            <legend className="field-label">Blood group</legend>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Blood group">
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
                      setSavedAt(null);
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
          </fieldset>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Date of birth"
              type="date"
              required
              max={toDateInputValue(new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000))}
              value={values.dateOfBirth}
              onChange={setField('dateOfBirth')}
              error={errors.dateOfBirth}
            />
            <Select
              label="Gender"
              required
              placeholder="Select…"
              options={GENDER_OPTIONS}
              value={values.gender}
              onChange={setField('gender')}
              error={errors.gender}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Last donation date"
              type="date"
              max={toDateInputValue(new Date())}
              value={values.lastDonationDate}
              onChange={setField('lastDonationDate')}
              error={errors.lastDonationDate}
              hint="Used to show a general eligibility indicator."
            />
            <Select
              label="Preferred contact method"
              options={CONTACT_OPTIONS}
              value={values.preferredContactMethod}
              onChange={setField('preferredContactMethod')}
            />
          </div>
        </section>

        {/* Location */}
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink-900">Location</h2>
          <p className="mt-1 text-xs text-ink-500">
            Used to match you with people nearby. Your exact coordinates are never shown to anyone.
          </p>
          <div className="mt-4">
            <LocationPicker
              value={values}
              onChange={setLocation}
              error={errors.latitude || errors.city}
              cityRequired
            />
          </div>
        </section>

        {/* About */}
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink-900">About</h2>
          <Textarea
            containerClassName="mt-4"
            label="Short note (optional)"
            value={values.bio}
            onChange={setField('bio')}
            maxLength={400}
            rows={4}
            placeholder="e.g. Available most evenings near the city centre. Prefer a message first."
          />
        </section>

        <div className="flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-xs text-ink-500" role="status" aria-live="polite">
            {savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : ''}
          </p>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={() => setValues(toFormValues(user))} disabled={saving}>
              Discard changes
            </Button>
            <Button type="submit" variant="primary" className="flex-1 sm:flex-none" loading={saving}>
              Save changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
