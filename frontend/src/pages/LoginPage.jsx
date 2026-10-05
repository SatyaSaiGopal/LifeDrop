import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validateEmail } from '../utils/validation';
import { Logo } from '../components/layout/Navbar';

export default function LoginPage() {
  const { login, isAuthenticated, isReady, sessionNotice, clearSessionNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (isReady && isAuthenticated) {
    const redirectTo = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  const setField = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    const nextErrors = {
      email: validateEmail(values.email),
      password: values.password ? null : 'Password is required',
    };
    const filtered = Object.fromEntries(Object.entries(nextErrors).filter(([, v]) => v));
    setErrors(filtered);
    if (Object.keys(filtered).length) return;

    setSubmitting(true);
    try {
      const user = await login({ email: values.email.trim(), password: values.password });
      clearSessionNotice();
      toast.success(`Welcome back, ${user.name.split(' ')[0]}.`);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      // Field-level details from the API go to the fields; anything else is a
      // form-level message.
      if (err.details) setErrors(err.details);
      else setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center">
        <Link to="/" className="inline-block rounded-lg" aria-label="Lifeline home">
          <Logo className="justify-center" />
        </Link>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink-900">Sign in to Lifeline</h1>
        <p className="mt-2 text-sm text-ink-500">
          Manage your donor profile, respond to requests, or raise a request of your own.
        </p>
      </div>

      {sessionNotice && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
          {sessionNotice}
        </div>
      )}

      {formError && (
        <div className="mt-6 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800" role="alert">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <Input
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={values.email}
          onChange={setField('email')}
          error={errors.email}
          placeholder="you@example.com"
        />
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={values.password}
          onChange={setField('password')}
          error={errors.password}
          placeholder="Your password"
        />

        <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        New to Lifeline?{' '}
        <Link to="/register" className="link">
          Create an account
        </Link>
      </p>

      <div className="mt-8 rounded-lg border border-ink-200 bg-ink-50 p-4">
        <p className="text-xs font-semibold text-ink-600">Demo accounts (seeded development data)</p>
        <dl className="mt-2 space-y-1 text-xs text-ink-500">
          <div className="flex justify-between gap-3">
            <dt>Donor</dt>
            <dd className="font-mono">donor1@demo.lifeline.test</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Seeker</dt>
            <dd className="font-mono">seeker1@demo.lifeline.test</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Password</dt>
            <dd className="font-mono">Demo@1234</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
