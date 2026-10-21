import { CheckSquare } from 'lucide-react';
import FMChecklists from '../fm/FMChecklists';

export default function TechnicianChecklists() {
  return (
    <div className="space-y-6">
      <div className="dash-header">
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2"><CheckSquare size={20} />Daily checks</h1>
      </div>
      <FMChecklists roleFilter="tech" />
    </div>
  );
}
