import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { BloodGroupBadge, AvailabilityBadge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDistance } from '../../utils/format';

/**
 * "Request blood" from a donor card.
 *
 * A donor cannot be contacted directly from search, by design. This dialog
 * explains that and routes the user to create a real blood request, which is
 * the mechanism that grants contact once the donor accepts.
 */
export default function RequestDonorModal({ donor, open, onClose }) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (open) setAcknowledged(false);
  }, [open, donor?.id]);

  if (!donor) return null;

  const isSelf = donor.isSelf;

  const handleContinue = () => {
    onClose();
    if (!isAuthenticated) {
      toast.info('Sign in to raise a blood request.');
      navigate('/login', { state: { from: { pathname: '/requests/new' } } });
      return;
    }
    // Pre-fill the request with this donor's group so the form is relevant.
    navigate('/requests/new', {
      state: {
        prefill: {
          bloodGroup: donor.bloodGroup,
          city: donor.city,
          state: donor.state,
          country: donor.country,
          areaLabel: donor.areaLabel,
        },
      },
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isSelf ? 'This is your own profile' : `Request blood from ${donor.name}`}
      description={
        isSelf
          ? 'You cannot request blood from yourself.'
          : 'To protect donor privacy, contact details are shared only after a donor accepts your request.'
      }
      footer={
        isSelf ? (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleContinue} disabled={!acknowledged}>
              Continue to request
            </Button>
          </>
        )
      }
    >
      {!isSelf && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-ink-200 bg-ink-50 p-3">
            <BloodGroupBadge group={donor.bloodGroup} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900">{donor.name}</p>
              <p className="truncate text-xs text-ink-500">
                {donor.areaLabel || donor.city}
                {donor.distanceKm != null && ` · ${formatDistance(donor.distanceKm)} away`}
              </p>
            </div>
            <div className="ml-auto">
              <AvailabilityBadge available={donor.available} size="sm" />
            </div>
          </div>

          <div className="rounded-lg border border-ink-200 p-3 text-sm leading-relaxed text-ink-600">
            <p className="font-semibold text-ink-800">How this works</p>
            <ol className="mt-2 space-y-1.5 text-xs">
              <li>1. You create a blood request with the hospital and how urgently it is needed.</li>
              <li>2. Lifeline shows the request to compatible donors near the hospital, including this donor.</li>
              <li>3. If this donor accepts, their preferred contact method is shared with you and you coordinate directly.</li>
            </ol>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink-200 p-3">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-ink-700">
              I understand this creates a public blood request and that contact details are shared only after the
              donor accepts.
            </span>
          </label>

          {!user && (
            <p className="text-xs text-ink-500">You will be asked to sign in on the next step.</p>
          )}
        </div>
      )}
    </Modal>
  );
}
