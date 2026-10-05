import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

/** Privacy page: what is stored, what is shown, and how to control it. */
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Privacy and your data</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">
          Blood donation is health information, so Lifeline is built to share as little as possible while still
          connecting the right people.
        </p>
      </header>

      <div className="mt-8 space-y-6">
        <Section title="What we store">
          <ul className="space-y-2">
            <Item>Your name, email address and phone number, so people can reach you when you accept a request.</Item>
            <Item>Your blood group, date of birth, gender and donation history, to match you correctly and show a general eligibility indicator.</Item>
            <Item>Your location coordinates, used only to calculate distance and find donors near a request.</Item>
            <Item>Your city, state, country and an optional area label, which is what other people actually see.</Item>
            <Item>Your availability, contact preference and optional short bio.</Item>
          </ul>
        </Section>

        <Section title="What is never shown publicly">
          <ul className="space-y-2">
            <Item>Your exact home address or precise coordinates. Search results and the map show an approximate area only.</Item>
            <Item>Your email address and phone number. These are shared only after you accept a blood request.</Item>
            <Item>Your date of birth. We show an eligibility indicator instead of the raw date.</Item>
            <Item>Your password. It is stored only as a one-way hash and can never be read back, even by us.</Item>
          </ul>
        </Section>

        <Section title="What you control">
          <ul className="space-y-2">
            <Item>Availability. Switch to unavailable at any time and you disappear from "available now" searches immediately.</Item>
            <Item>Contact preference. Choose whether people should call, email, or message you in-app once you accept a request.</Item>
            <Item>Profile details. Edit or clear your bio and area label whenever you like.</Item>
            <Item>Your account. Update your details from your profile page at any time.</Item>
          </ul>
        </Section>

        <Section title="How contact works">
          <p className="text-sm leading-relaxed text-ink-600">
            Donors are not directly contactable from search results. When someone needs blood they create a request,
            and if you accept it your preferred contact method is shared with them so you can coordinate. If you
            decline, nothing is shared.
          </p>
        </Section>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-amber-900">Medical disclaimer</h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-900">
            Lifeline is a donor discovery and coordination platform. It does not provide medical advice, does not
            decide whether you can donate or receive blood, and does not replace doctors, hospitals, blood banks or
            emergency services. Final eligibility and compatibility must be confirmed by a qualified medical
            professional or the relevant blood bank.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button as="link" to="/register" variant="primary">
          Register as a donor
        </Button>
        <Button as="link" to="/search" variant="secondary">
          Find donors
        </Button>
      </div>

      <p className="mt-6 text-xs text-ink-400">
        This is a demonstration application. Seed data is fictional. See the{' '}
        <Link to="/" className="link">
          home page
        </Link>{' '}
        for an overview of the platform.
      </p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Item({ children }) {
  return (
    <li className="flex gap-2.5 text-sm leading-relaxed text-ink-600">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}
