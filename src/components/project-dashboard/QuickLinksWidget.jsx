import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  MessageSquareWarning, AlertCircle, Calendar, FileCheck,
  Truck, DollarSign, Package, FileText, Wrench, BarChart3
} from 'lucide-react';

const QUICK_LINKS = [
  { label: 'RFI Hub',       page: 'RFIHub',             icon: MessageSquareWarning, color: 'text-amber-400',  bg: 'bg-amber-500/10 hover:bg-amber-500/20' },
  { label: 'Alerts',        page: 'Alerts',             icon: AlertCircle,          color: 'text-red-400',    bg: 'bg-red-500/10 hover:bg-red-500/20' },
  { label: 'Schedule',      page: 'Schedule',           icon: Calendar,             color: 'text-blue-400',   bg: 'bg-blue-500/10 hover:bg-blue-500/20' },
  { label: 'Change Orders', page: 'ChangeOrders',       icon: FileCheck,            color: 'text-purple-400', bg: 'bg-purple-500/10 hover:bg-purple-500/20' },
  { label: 'Deliveries',    page: 'Deliveries',         icon: Truck,                color: 'text-cyan-400',   bg: 'bg-cyan-500/10 hover:bg-cyan-500/20' },
  { label: 'Financials',    page: 'FinancialsRedesign', icon: DollarSign,           color: 'text-green-400',  bg: 'bg-green-500/10 hover:bg-green-500/20' },
  { label: 'Work Packages', page: 'WorkPackages',       icon: Package,              color: 'text-orange-400', bg: 'bg-orange-500/10 hover:bg-orange-500/20' },
  { label: 'Documents',     page: 'Documents',          icon: FileText,             color: 'text-zinc-400',   bg: 'bg-zinc-500/10 hover:bg-zinc-500/20' },
  { label: 'Fabrication',   page: 'Fabrication',        icon: Wrench,               color: 'text-rose-400',   bg: 'bg-rose-500/10 hover:bg-rose-500/20' },
  { label: 'Analytics',     page: 'ProjectAnalyticsDashboard', icon: BarChart3,    color: 'text-indigo-400', bg: 'bg-indigo-500/10 hover:bg-indigo-500/20' },
];

export default function QuickLinksWidget() {
  const navigate = useNavigate();

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-[#6B7280] mb-3">Quick Access</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {QUICK_LINKS.map(({ label, page, icon: Icon, color, bg }) => (
          <button
            key={page}
            onClick={() => navigate(createPageUrl(page))}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border border-white/5 transition-all ${bg} cursor-pointer`}
          >
            <Icon size={18} className={color} />
            <span className="text-[11px] font-medium text-[#9CA3AF] text-center leading-tight">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}