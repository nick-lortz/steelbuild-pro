import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';

const formatCurrency = (value) => {
  if (value == null) return '$0.00';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  return value < 0 ? `( $${formatted} )` : `$${formatted}`;
};

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-zinc-700 text-zinc-300', icon: Clock },
  submitted: { label: 'Submitted', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock },
  under_review: { label: 'Under Review', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle }
};

export default function ChangesPanel({ changeOrders, onStatusChange, onAdd, canEdit }) {
  const handleStatusChange = async (coId, newStatus) => {
    await onStatusChange(coId, newStatus);
  };

  const approvedTotal = changeOrders
    .filter(co => co.status === 'approved')
    .reduce((sum, co) => sum + (co.cost_impact || 0), 0);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-white text-sm">Change Orders</CardTitle>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
              {formatCurrency(approvedTotal)} Approved
            </Badge>
          </div>
          {canEdit && (
            <Button size="sm" onClick={onAdd} className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold">
              <Plus size={12} className="mr-1" />
              New CO
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {changeOrders.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">
            No change orders
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-950 border-b border-zinc-700">
                <tr>
                  <th className="text-left p-3 text-zinc-400 font-bold text-xs uppercase w-24">CO #</th>
                  <th className="text-left p-3 text-zinc-400 font-bold text-xs uppercase">Title</th>
                  <th className="text-left p-3 text-zinc-400 font-bold text-xs uppercase w-32">Status</th>
                  <th className="text-right p-3 text-zinc-400 font-bold text-xs uppercase w-32">Cost Impact</th>
                  <th className="text-center p-3 text-zinc-400 font-bold text-xs uppercase w-32">Submitted</th>
                  <th className="text-center p-3 text-zinc-400 font-bold text-xs uppercase w-32">Approved</th>
                </tr>
              </thead>
              <tbody>
                {changeOrders.map((co) => {
                  const config = statusConfig[co.status] || statusConfig.draft;
                  const Icon = config.icon;

                  return (
                    <tr key={co.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                      <td className="p-3 text-white font-mono text-xs">CO-{co.co_number}</td>
                      <td className="p-3 text-white text-xs">{co.title}</td>
                      <td className="p-3">
                        {canEdit ? (
                          <Select 
                            value={co.status} 
                            onValueChange={(val) => handleStatusChange(co.id, val)}
                          >
                            <SelectTrigger className="h-7 text-xs border-zinc-700 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="submitted">Submitted</SelectItem>
                              <SelectItem value="under_review">Under Review</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={config.color}>
                            <Icon size={10} className="mr-1" />
                            {config.label}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono text-xs">
                        <span className={co.cost_impact >= 0 ? 'text-white' : 'text-red-400'}>
                          {formatCurrency(co.cost_impact)}
                        </span>
                      </td>
                      <td className="p-3 text-center text-zinc-400 text-xs">
                        {co.submitted_date || '-'}
                      </td>
                      <td className="p-3 text-center text-zinc-400 text-xs">
                        {co.approved_date || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}