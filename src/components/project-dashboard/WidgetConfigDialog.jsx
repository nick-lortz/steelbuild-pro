import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pin, PinOff, GripVertical, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const WIDGET_META = {
  predictive_risk:       { category: 'Analytics', description: 'AI-powered risk forecasting and trend analysis' },
  progress:             { category: 'Schedule',  description: 'Overall project progress by phase and milestone' },
  budget:               { category: 'Financial', description: 'Budget vs actual spend with variance indicators' },
  margin_risk:          { category: 'Financial', description: 'Work packages approaching or exceeding margin thresholds' },
  erection_readiness:   { category: 'Field',     description: 'Tasks blocked from erection start and root causes' },
  ai_risk:              { category: 'Analytics', description: 'Real-time AI risk scoring across cost, schedule, and RFIs' },
  resource_optimization:{ category: 'Resources', description: 'Resource conflicts and leveling recommendations' },
  documents:            { category: 'Comms',     description: 'Recent document activity and pending approvals' },
  rfis:                 { category: 'Comms',     description: 'Open RFIs by priority, age, and ball-in-court' },
  deliveries:           { category: 'Logistics', description: 'Upcoming scheduled deliveries and conflicts' },
  change_orders:        { category: 'Financial', description: 'Change order pipeline, pending approvals, cost impact' },
  work_packages:        { category: 'Field',     description: 'Work package status and phase transitions' },
  drawings:             { category: 'Drawings',  description: 'Drawing set statuses, revisions, and QA results' },
};

const CATEGORY_COLORS = {
  Analytics: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Schedule:  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Financial: 'bg-green-500/20 text-green-300 border-green-500/30',
  Field:     'bg-orange-500/20 text-orange-300 border-orange-500/30',
  Resources: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  Comms:     'bg-amber-500/20 text-amber-300 border-amber-500/30',
  Logistics: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  Drawings:  'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
};

export default function WidgetConfigDialog({ open, onClose, availableWidgets, currentLayout, onUpdateLayout }) {
  const [selected, setSelected] = useState(new Set(currentLayout));
  const [filter, setFilter] = useState('All');

  // Sync selected state whenever dialog opens
  React.useEffect(() => {
    if (open) setSelected(new Set(currentLayout));
  }, [open]);

  const categories = ['All', ...new Set(availableWidgets.map(w => WIDGET_META[w.id]?.category || 'Other'))];

  const handleToggle = (widgetId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(widgetId)) next.delete(widgetId); else next.add(widgetId);
      return next;
    });
  };

  const handleSave = () => {
    // Preserve order: existing pinned first, then newly added
    const existing = currentLayout.filter(id => selected.has(id));
    const added = [...selected].filter(id => !currentLayout.includes(id));
    onUpdateLayout([...existing, ...added]);
    onClose();
  };

  const filtered = availableWidgets.filter(w =>
    filter === 'All' || (WIDGET_META[w.id]?.category || 'Other') === filter
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white">Customize Dashboard Widgets</DialogTitle>
          <p className="text-xs text-zinc-400 mt-1">Pin the widgets you want visible. Drag to reorder on the dashboard.</p>
        </DialogHeader>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                filter === cat
                  ? 'bg-amber-500 text-black border-amber-500'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Widget list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 mt-2">
          {filtered.map(widget => {
            const meta = WIDGET_META[widget.id] || {};
            const isPinned = selected.has(widget.id);
            const catColor = CATEGORY_COLORS[meta.category] || 'bg-zinc-700/30 text-zinc-300 border-zinc-600/30';

            return (
              <div
                key={widget.id}
                onClick={() => handleToggle(widget.id)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none',
                  isPinned
                    ? 'border-amber-500/40 bg-amber-500/8'
                    : 'border-zinc-800 bg-zinc-800/30 hover:border-zinc-700'
                )}
              >
                <div className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                  isPinned ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-zinc-400'
                )}>
                  {isPinned ? <Pin size={14} /> : <PinOff size={14} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">{widget.label}</span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', catColor)}>
                      {meta.category}
                    </span>
                  </div>
                  {meta.description && (
                    <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{meta.description}</p>
                  )}
                </div>

                {isPinned && (
                  <Check size={16} className="text-amber-400 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <span className="text-xs text-zinc-500">{selected.size} widget{selected.size !== 1 ? 's' : ''} pinned</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="border-zinc-700 text-white">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              Apply Layout
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}