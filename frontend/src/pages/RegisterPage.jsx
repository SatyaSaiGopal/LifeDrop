import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import LocationPicker from '../components/ui/LocationPicker';
import { BloodGroupBadge } from '../components/ui/Badge';
import { Logo } from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { BLOOD_GROUPS, GENDER_OPTIONS, CONTACT_METHOD_LABELS, toDateInputValue } from '../utils/format';
import {
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
  validateBloodGroup,
  validateDateOfBirth,
  validatePastDate,
  validateCoordinates,
  validateRequired,
} from '../utils/validation';

const CONTACT_OPTIONS = Object.entries(CONTACT_METHOD_LABELS).map(([value, label]) => ({ value, label }));

const EMPTY = {
  role: 'donor',
  name: '',
  email: '',
  phone: '',
  password: '',
  bloodGroup: '',
  dateOfBirth: '',
  gender: '',
  city: '',
  state: '',
  country: '',
  latitude: null,
  longitude: null,
  areaLabel: '',
  available: true,
  lastDonationDate: '',
  preferredContactMethod: 'in_app',
  bio: '',
};

/** Registration. Donors fill account details first, then their donor profile. */
export default function RegisterPage() {
  const { register, isAuthenticated, isReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (isReady && isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname || '/dashboard'} replace />;
  }

  const setField = (field) => (event) => {
    const raw = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues((prev) => ({ ...prev, [field]: raw }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const setLocation = (next) => {
    setValues((prev) => ({ ...prev, ...next }));
    if (errors.latitude || errors.city) setErrors((prev) => ({ ...prev, latitude: undefined, city: undefined }));
  };

  /** Step 1 rules mirror the server; step 2 is only reached once they pass. */
  const validateAccount = () => {
    const next = {
      name: validateName(values.name),
      email: validateEmail(values.email),
      phone: validatePhone(values.phone),
      password: validatePassword(values.password),
    };
    return Object.fromEntries(Object.entries(next).filter(([, v]) => v));
  };

  const validateProfile = () => {
    const next = {
      bloodGroup: validateBloodGroup(values.bloodGroup),
      dateOfBirth: validateDateOfBirth(values.dateOfBirth),
      gender: validateRequired(values.gender, 'Gender'),
      lastDonationDate: validatePastDate(values.lastDonationDate, 'Last donation date'),
      latitude: validateCoordinates(values.latitude, values.longitude),
      city: validateRequired(values.city, 'City'),
      country: validateRequired(values.country, 'Country'),
    };
    return Object.fromEntries(Object.entries(next).filter(([, v]) => v));
  };

  const handleNext = (event) => {
    event.preventDefault();
    const nextErrors = validateAccount();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setStep(2);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    const nextErrors = validateProfile();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      // Move focus to the first problem so keyboard users are not stranded.
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await register({
        role: 'donor',
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        password: values.password,
        bloodGroup: values.bloodGroup,
        dateOfBirth: values.dateOfBirth,
        gender: values.gender,
        city: values.city.trim(),
        state: values.state.trim(),
        country: values.country.trim(),
        latitude: values.latitude,
        longitude: values.longitude,
        areaLabel: values.areaLabel.trim() || null,
        available: values.available,
        lastDonationDate: values.lastDonationDate || null,
        preferredContactMethod: values.preferredContactMethod,
        bio: values.bio.trim() || null,
      });
      toast.success('Your donor profile is live. You can now be found by people nearby.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.details) {
        setErrors(err.details);
        // A field on step 1 means the user needs to go back.
        const stepOneFields = ['name', 'email', 'phone', 'password'];
        if (Object.keys(err.details).some((f) => stepOneFields.includes(f))) setStep(1);
      } else {
        setFormError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="text-center">
        <Link to="/" className="inline-block rounded-lg" aria-label="Lifeline home">
          <Logo className="justify-center" />
        </Link>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink-900">Register as a blood donor</h1>
        <p className="mt-2 text-sm text-ink-500">
          Your profile takes about a minute. You control your availability and what is shared.
        </p>
      </div>

      {/* Progress indicator — two real steps, not decoration. */}
      <ol className="mt-8 flex items-center gap-3" aria-label="Registration progress">
        <StepMarker index={1} label="Account" active={step === 1} done={step > 1} />
        <span className="h-px flex-1 bg-ink-200" aria-hidden="true" />
        <StepMarker index={2} label="Donor details" active={step === 2} done={false} />
      </ol>

      {formError && (
        <div className="mt-6 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800" role="alert">
          {formError}
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleNext} className="mt-6 space-y-4" noValidate>
          <Input
            label="Full name"
            name="name"
            required
            autoComplete="name"
            value={values.name}
            onChange={setField('name')}
            error={errors.name}
            placeholder="e.g. Asha Verma"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Email address"
              type="email"
              name="email"
              required
              autoComplete="email"
              value={values.email}
              onChange={setField('email')}
              error={errors.email}
              placeholder="you@example.com"
            />
            <Input
              label="Phone number"
              type="tel"
              name="phone"
              required
              autoComplete="tel"
              value={values.phone}
              onChange={setField('phone')}
              error={errors.phone}
              placeholder="+91 98765 43210"
              hint="Shared only after you accept a request."
            />
          </div>
          <Input
            label="Password"
            type="password"
            name="password"
            required
            autoComplete="new-password"
            value={values.password}
            onChange={setField('password')}
            error={errors.password}
            hint="At least 8 characters, including a letter and a number."
          />

          <Button type="submit" variant="primary" size="lg" fullWidth>
            Continue
          </Button>

          <p className="text-center text-sm text-ink-500">
            Already have an account?{' '}
            <Link to="/login" className="link">
              Sign in
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          <fieldset>
            <legend className="field-label">
              Blood group
              <span className="ml-0.5 text-brand-600" aria-hidden="true">
                *
              </span>
            </legend>
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
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Date of birth"
              type="date"
              name="dateOfBirth"
              required
              max={toDateInputValue(new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000))}
              value={values.dateOfBirth}
              onChange={setField('dateOfBirth')}
              error={errors.dateOfBirth}
              hint="Donors must be at least 18."
            />
            <Select
              label="Gender"
              name="gender"
              required
              placeholder="Select…"
              options={GENDER_OPTIONS}
              value={values.gender}
              onChange={setField('gender')}
              error={errors.gender}
            />
          </div>

          <LocationPicker
            value={values}
            onChange={setLocation}
            error={errors.latitude || errors.city}
            required
            label="Where are you based?"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Last donation date"
              type="date"
              name="lastDonationDate"
              max={toDateInputValue(new Date())}
              value={values.lastDonationDate}
              onChange={setField('lastDonationDate')}
              error={errors.lastDonationDate}
              hint="Leave blank if you have never donated."
            />
            <Select
              label="Preferred contact method"
              name="preferredContactMethod"
              options={CONTACT_OPTIONS}
              value={values.preferredContactMethod}
              onChange={setField('preferredContactMethod')}
              hint="How you would like to be reached once you accept a request."
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink-200 bg-white p-3.5">
            <input
              type="checkbox"
              checked={values.available}
              onChange={setField('available')}
              className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            <span>
              <span className="block text-sm font-semibold text-ink-800">I am available to donate</span>
              <span className="mt-0.5 block text-xs text-ink-500">
                You can change this any time. When you are unavailable you will not appear in searches for available
                donors.
              </span>
            </span>
          </label>

          <Textarea
            label="About you (optional)"
            name="bio"
            value={values.bio}
            onChange={setField('bio')}
            maxLength={400}
            rows={3}
            placeholder="e.g. Available most evenings and weekends near the city centre."
            hint="A short note helps people reach out appropriately. Do not include personal contact details."
          />

          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            <strong className="font-semibold">Medical disclaimer:</strong> Lifeline does not decide whether you can
            donate. Final eligibility is confirmed by the collecting blood bank or a qualified medical professional.
          </p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => setStep(1)} disabled={submitting}>
              Back
            </Button>
            <Button type="submit" variant="primary" size="lg" className="flex-1" loading={submitting}>
              Create my donor profile
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function StepMarker({ index, label, active, done }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
          done ? 'bg-emerald-600 text-white' : active ? 'bg-brand-600 text-white' : 'bg-ink-200 text-ink-500'
        }`}
        aria-hidden="true"
      >
        {done ? (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor">
            <path d="M6 0a6 6 0 1 0 0 12A6 6 0 0 0 6 0Zm2.8 4.6L5.6 7.8 3.7 6l.8-.8 1.1 1.1 2.4-2.4.8.7Z" />
          </svg>
        ) : (
          index
        )}
      </span>
      <span className={`text-sm font-medium ${active || done ? 'text-ink-800' : 'text-ink-400'}`}>
        {label}
        {active && <span className="sr-only"> (current step)</span>}
      </span>
    </li>
  );
}
