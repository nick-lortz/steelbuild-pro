import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, AlertTriangle, CheckSquare, Square, Zap, XCircle, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { SafeText } from '@/components/shared/sanitization';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function RFIHubTable({ rfis, onEdit, onDelete, title }) {
  const [selected, setSelected] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const queryClient = useQueryClient();

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === rfis.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rfis.map(r => r.id)));
    }
  };

  const applyBulkAction = async () => {
    if (!bulkAction || selected.size === 0) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selected);
      let updateData = {};
      if (bulkAction === 'close') updateData = { status: 'closed' };
      else if (bulkAction === 'submit') updateData = { status: 'submitted' };
      else if (bulkAction === 'flag_fab') updateData = { fab_blocker: true, fabrication_hold: true };
      else if (bulkAction === 'clear_fab') updateData = { fab_blocker: false, fabrication_hold: false };
      else if (bulkAction === 'bic_gc') updateData = { ball_in_court: 'gc' };
      else if (bulkAction === 'bic_architect') updateData = { ball_in_court: 'architect' };
      else if (bulkAction === 'bic_internal') updateData = { ball_in_court: 'internal' };

      await Promise.all(ids.map(id => base44.entities.RFI.update(id, updateData)));
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      toast.success(`Updated ${ids.length} RFIs`);
      setSelected(new Set());
      setBulkAction('');
    } catch {
      toast.error('Bulk update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  if (!rfis || rfis.length === 0) {
    return (
      <Card className="bg-[#0A0A0A] border-[rgba(255,255,255,0.08)]">
        <CardContent className="py-12 text-center">
          <p className="text-[#6B7280] text-sm">No RFIs in this category</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-zinc-700 text-zinc-300';
      case 'internal_review': return 'bg-blue-700 text-blue-300';
      case 'submitted': return 'bg-blue-900 text-blue-200';
      case 'under_review': return 'bg-amber-700 text-amber-300';
      case 'answered': return 'bg-green-700 text-green-300';
      case 'closed': return 'bg-zinc-700 text-zinc-400';
      default: return 'bg-zinc-700 text-zinc-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-700 text-red-300 border-red-600';
      case 'high': return 'bg-orange-700 text-orange-300 border-orange-600';
      case 'medium': return 'bg-yellow-700 text-yellow-300 border-yellow-600';
      case 'low': return 'bg-zinc-700 text-zinc-400 border-zinc-600';
      default: return 'bg-zinc-700 text-zinc-400 border-zinc-600';
    }
  };

  const allSelected = rfis.length > 0 && selected.size === rfis.length;
  const someSelected = selected.size > 0;

  return (
    <Card className="bg-[#0A0A0A] border-[rgba(255,255,255,0.08)]">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm uppercase tracking-wider text-[#E5E7EB]">{title}</CardTitle>
        {someSelected && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9CA3AF]">{selected.size} selected</span>
            <Select value={bulkAction} onValueChange={setBulkAction}>
              <SelectTrigger className="h-8 w-48 text-xs bg-[#050505] border-[rgba(255,255,255,0.1)]">
                <SelectValue placeholder="Bulk Action..." />
              </SelectTrigger>
              <SelectContent className="bg-[#0A0A0A] border-[rgba(255,255,255,0.1)]">
                <SelectItem value="submit" className="text-xs">→ Submit</SelectItem>
                <SelectItem value="close" className="text-xs">→ Close</SelectItem>
                <SelectItem value="flag_fab" className="text-xs">Flag Fab Hold</SelectItem>
                <SelectItem value="clear_fab" className="text-xs">Clear Fab Hold</SelectItem>
                <SelectItem value="bic_gc" className="text-xs">BIC → GC</SelectItem>
                <SelectItem value="bic_architect" className="text-xs">BIC → Architect</SelectItem>
                <SelectItem value="bic_internal" className="text-xs">BIC → Internal</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={applyBulkAction} disabled={!bulkAction || bulkLoading} className="h-8 text-xs">
              {bulkLoading ? 'Applying...' : 'Apply'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="h-8 w-8 p-0">
              <XCircle size={14} />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                <th className="py-2 px-3 w-8">
                  <button onClick={toggleAll} className="text-[#6B7280] hover:text-[#FF9D42]">
                    {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                  </button>
                </th>
                <th className="text-left py-2 px-3 text-[10px] text-[#6B7280] uppercase font-bold tracking-widest">RFI #</th>
                <th className="text-left py-2 px-3 text-[10px] text-[#6B7280] uppercase font-bold tracking-widest">Project</th>
                <th className="text-left py-2 px-3 text-[10px] text-[#6B7280] uppercase font-bold tracking-widest">Subject</th>
                <th className="text-left py-2 px-3 text-[10px] text-[#6B7280] uppercase font-bold tracking-widest">Type</th>
                <th className="text-left py-2 px-3 text-[10px] text-[#6B7280] uppercase font-bold tracking-widest">Status</th>
                <th className="text-left py-2 px-3 text-[10px] text-[#6B7280] uppercase font-bold tracking-widest">Priority</th>
                <th className="text-left py-2 px-3 text-[10px] text-[#6B7280] uppercase font-bold tracking-widest">BIC</th>
                <th className="text-left py-2 px-3 text-[10px] text-[#6B7280] uppercase font-bold tracking-widest">Age</th>
                <th className="text-left py-2 px-3 text-[10px] text-[#6B7280] uppercase font-bold tracking-widest">Due</th>
                <th className="text-left py-2 px-3 text-[10px] text-[#6B7280] uppercase font-bold tracking-widest">Flags</th>
                <th className="text-right py-2 px-3 text-[10px] text-[#6B7280] uppercase font-bold tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rfis.map((rfi) => (
                <tr
                  key={rfi.id}
                  className={`border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,157,66,0.03)] transition-colors ${selected.has(rfi.id) ? 'bg-[rgba(255,157,66,0.05)]' : ''}`}
                >
                  <td className="py-2 px-3">
                    <button onClick={() => toggleSelect(rfi.id)} className="text-[#6B7280] hover:text-[#FF9D42]">
                      {selected.has(rfi.id) ? <CheckSquare size={14} className="text-[#FF9D42]" /> : <Square size={14} />}
                    </button>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-mono text-[#FF9D42] font-bold text-sm">{rfi.rfi_number}</span>
                  </td>
                  <td className="py-2 px-3">
                    <div>
                      <p className="text-[#E5E7EB] text-xs font-medium">{rfi.project_number}</p>
                      <p className="text-[#6B7280] text-[10px] truncate max-w-[130px]">{rfi.project_name}</p>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <p className="text-[#E5E7EB] font-medium truncate max-w-[220px] text-xs">
                      <SafeText content={rfi.subject || ''} />
                    </p>
                  </td>
                  <td className="py-2 px-3">
                    <Badge variant="outline" className="text-[10px] capitalize border-[rgba(255,255,255,0.1)] text-[#9CA3AF]">
                      {rfi.rfi_type?.replace(/_/g, ' ') || '—'}
                    </Badge>
                  </td>
                  <td className="py-2 px-3">
                    <Badge className={`text-[10px] capitalize ${getStatusColor(rfi.status)}`}>
                      {rfi.status?.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="py-2 px-3">
                    <Badge className={`text-[10px] capitalize ${getPriorityColor(rfi.priority)}`}>
                      {rfi.priority}
                    </Badge>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`text-[11px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      ['gc','architect','engineer','external'].includes(rfi.ball_in_court)
                        ? 'bg-blue-950 text-blue-300'
                        : 'bg-[#0F0F0F] text-[#9CA3AF]'
                    }`}>
                      {rfi.ball_in_court || '—'}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      {rfi.is_at_risk && <AlertTriangle size={11} className="text-red-500 flex-shrink-0" />}
                      <span className={`text-xs ${rfi.is_at_risk ? 'text-red-400 font-semibold' : 'text-[#6B7280]'}`}>
                        {rfi.business_days_open ?? rfi.age_days ?? '—'}d
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    {rfi.due_date ? (
                      <div>
                        <p className={`text-xs ${rfi.is_overdue ? 'text-red-400 font-semibold' : 'text-[#9CA3AF]'}`}>
                          {format(parseISO(rfi.due_date), 'MMM d')}
                        </p>
                        {rfi.days_until_due !== null && (
                          <p className={`text-[10px] ${rfi.days_until_due < 0 ? 'text-red-500' : 'text-[#6B7280]'}`}>
                            {rfi.days_until_due < 0 ? `${Math.abs(rfi.days_until_due)}d LATE` : `${rfi.days_until_due}d`}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-[#4B5563] text-xs">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1 flex-wrap">
                      {rfi.fab_blocker && <span className="text-[9px] bg-red-950 text-red-300 px-1 py-0.5 rounded font-bold">FAB</span>}
                      {rfi.is_install_blocker && <span className="text-[9px] bg-orange-950 text-orange-300 px-1 py-0.5 rounded font-bold">ERECT</span>}
                      {rfi.escalation_flag && <span className="text-[9px] bg-yellow-950 text-yellow-300 px-1 py-0.5 rounded font-bold">ESC</span>}
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => onEdit(rfi)}
                        className="h-7 w-7 p-0 text-[#3B82F6] hover:text-blue-300 hover:bg-blue-900/20">
                        <Pencil size={12} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(rfi)}
                        className="h-7 w-7 p-0 text-[#EF4444] hover:text-red-300 hover:bg-red-900/20">
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}