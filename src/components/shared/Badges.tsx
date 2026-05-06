import type { RequestStatus, Priority, UserRole } from '../../types';
import {
  STATUS_LABELS, STATUS_COLORS,
  PRIORITY_LABELS, PRIORITY_COLORS,
  ROLE_LABELS, ROLE_COLORS,
} from '../../utils/helpers';

const STATUS_DOT: Record<RequestStatus, string> = {
  REQUEST_CREATED:    'bg-slate-400',
  PROCUREMENT_REVIEW: 'bg-blue-400',
  PO_GENERATED:       'bg-indigo-400',
  SUPERVISOR_APPROVAL:'bg-purple-400',
  PAYMENT_PENDING:    'bg-amber-400',
  ADMIN_APPROVED:     'bg-orange-400',
  PAID:               'bg-emerald-400',
  CLOSED:             'bg-slate-300',
  REJECTED:           'bg-red-400',
};

const PRIORITY_DOT: Record<Priority, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-400',
  medium:   'bg-amber-400',
  low:      'bg-slate-400',
};

export const StatusBadge = ({ status }: { status: RequestStatus }) => (
  <span className={`badge ${STATUS_COLORS[status]}`}>
    <span className={`badge-dot ${STATUS_DOT[status]}`} />
    {STATUS_LABELS[status]}
  </span>
);

export const PriorityBadge = ({ priority }: { priority: Priority }) => (
  <span className={`badge ${PRIORITY_COLORS[priority]}`}>
    <span className={`badge-dot ${PRIORITY_DOT[priority]}`} />
    {PRIORITY_LABELS[priority]}
  </span>
);

export const RoleBadge = ({ role }: { role: UserRole }) => (
  <span className={`badge ${ROLE_COLORS[role]}`}>
    {ROLE_LABELS[role]}
  </span>
);
