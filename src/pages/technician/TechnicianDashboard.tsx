import { ClipboardList } from 'lucide-react';
import FMDailyWalk from '../fm/FMDailyWalk';
import { useStore } from '../../store/useStore';

// The technician's dashboard is just their checklist — the tech-scoped items
// the FM's templates assign to them on today's site walk.
export default function TechnicianDashboard() {
  const { currentUser } = useStore();
  return (
    <div className="space-y-5">
      <div className="dash-header">
        <div>
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Technician</p>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2"><ClipboardList size={20} />Technical checks</h1>
          <p className="text-white/60 text-sm mt-1">{currentUser?.name} · Technician — your checks on today's site walk; the FM can only submit once these are recorded.</p>
        </div>
      </div>
      <FMDailyWalk embedded />
    </div>
  );
}
