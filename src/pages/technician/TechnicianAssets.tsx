import { Package } from 'lucide-react';
import FMAssets from '../fm/FMAssets';

export default function TechnicianAssets() {
  return (
    <div className="space-y-6">
      <div className="dash-header">
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2"><Package size={20} />Asset Registry</h1>
      </div>
      <FMAssets />
    </div>
  );
}
