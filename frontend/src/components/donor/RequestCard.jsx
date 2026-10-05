import { Link } from 'react-router-dom';
import Badge, { BloodGroupBadge } from '../ui/Badge';
import { formatDateTime, relativeTime, statusTone, urgencyTone, formatDistance } from '../../utils/format';

/**
 * Blood request summary card used in the feed, dashboard and "my requests".
 * Status is conveyed with both a label and a colour, never colour alone.
 */
export default function RequestCard({ request, distanceKm = null, compact = false }) {
  const status = statusTone(request.status);

  return (
    <article className="card-interactive p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <BloodGroupBadge group={request.bloodGroup} />
            <h3 className="truncate text-sm font-semibold text-ink-900">
              <Link to={`/requests/${request.id}`} className="hover:text-brand-700">
                {request.unitsRequired} unit{request.unitsRequired === 1 ? '' : 's'} needed
              </Link>
            </h3>
          </div>
          <p className="mt-1 truncate text-xs text-ink-500">
            {request.hospitalName}
            {request.city && `, ${request.city}`}
            {distanceKm != null && <span className="text-ink-400"> · {formatDistance(distanceKm)} away</span>}
          </p>
        </div>
        <span className={`badge shrink-0 ${status.className}`}>{status.label}</span>
      </div>

      {!compact && request.message && (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-600">{request.message}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge tone="neutral" className={urgencyTone(request.urgency)}>
          {request.urgency === 'critical' ? 'Critical' : request.urgency === 'high' ? 'High priority' : request.urgency === 'low' ? 'Low priority' : 'Normal'}
        </Badge>
        <Badge tone="neutral">
          Needed {relativeTime(request.requiredAt)}
        </Badge>
        {request.acceptedCount > 0 && (
          <Badge tone="success">
            {request.acceptedCount} donor{request.acceptedCount === 1 ? '' : 's'} accepted
          </Badge>
        )}
        {request.myResponse?.status === 'accepted' && <Badge tone="success">You accepted</Badge>}
        {request.myResponse?.status === 'declined' && <Badge tone="neutral">You declined</Badge>}
      </div>

      <div className="mt-3.5 flex items-center justify-between border-t border-ink-100 pt-3">
        <p className="text-2xs text-ink-400" title={formatDateTime(request.createdAt)}>
          Posted {relativeTime(request.createdAt)}
          {request.patientName ? ` · patient ${request.patientName}` : ''}
        </p>
        <Link to={`/requests/${request.id}`} className="text-xs font-semibold text-brand-700 hover:underline">
          View details
        </Link>
      </div>
    </article>
  );
}
