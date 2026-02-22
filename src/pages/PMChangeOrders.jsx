import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import PMProjectSelector from '@/components/pm-toolkit/PMProjectSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/notifications';

export default function PMChangeOrders() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [showCODialog, setShowCODialog] = useState(false);
  const [selectedCO, setSelectedCO] = useState(null);
  const [showLineItemDialog, setShowLineItemDialog] = useState(false);

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders', activeProjectId],
    queryFn: () => base44.entities.ChangeOrder.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: lineItems = [] } = useQuery({
    queryKey: ['coLineItems', selectedCO?.id],
    queryFn: () => base44.entities.ChangeOrderLineItem.filter({ change_order_id: selectedCO.id }),
    enabled: !!selectedCO
  });

  const { data: rateCard } = useQuery({
    queryKey: ['rateCard'],
    queryFn: () => base44.entities.RateCard.filter({ is_default: true }),
    select: (data) => data[0]
  });

  const createCOMutation = useMutation({
    mutationFn: (data) => base44.entities.ChangeOrder.create(data),
    onMutate: async (newCO) => {
      await queryClient.cancelQueries({ queryKey: ['changeOrders', activeProjectId] });
      
      const previousCOs = queryClient.getQueryData(['changeOrders', activeProjectId]);
      
      const optimisticCO = {
        ...newCO,
        id: `temp-${Date.now()}`,
        created_date: new Date().toISOString()
      };
      
      queryClient.setQueryData(['changeOrders', activeProjectId], (old = []) => [...old, optimisticCO]);
      
      return { previousCOs };
    },
    onError: (error, newCO, context) => {
      queryClient.setQueryData(['changeOrders', activeProjectId], context.previousCOs);
      toast.error('Failed to create change order');
    },
    onSuccess: () => {
      toast.success('Change order created');
      setShowCODialog(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
    }
  });

  const updateCOMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChangeOrder.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['changeOrders', activeProjectId] });
      const previousCOs = queryClient.getQueryData(['changeOrders', activeProjectId]);
      queryClient.setQueryData(['changeOrders', activeProjectId], (old = []) =>
        old.map(co => co.id === id ? { ...co, ...data } : co)
      );
      return { previousCOs };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(['changeOrders', activeProjectId], context.previousCOs);
      toast.error('Failed to update change order');
    },
    onSuccess: () => {
      toast.success('Change order updated');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
    }
  });

  const createLineItemMutation = useMutation({
    mutationFn: (data) => base44.entities.ChangeOrderLineItem.create(data),
    onMutate: async (newLineItem) => {
      await queryClient.cancelQueries({ queryKey: ['coLineItems', selectedCO?.id] });
      
      const previousLineItems = queryClient.getQueryData(['coLineItems', selectedCO?.id]);
      
      const optimisticLineItem = {
        ...newLineItem,
        id: `temp-${Date.now()}`,
        created_date: new Date().toISOString()
      };
      
      queryClient.setQueryData(['coLineItems', selectedCO?.id], (old = []) => [...old, optimisticLineItem]);
      
      return { previousLineItems };
    },
    onError: (error, newLineItem, context) => {
      queryClient.setQueryData(['coLineItems', selectedCO?.id], context.previousLineItems);
      toast.error('Failed to add line item');
    },
    onSuccess: () => {
      toast.success('Line item added');
      setShowLineItemDialog(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['coLineItems'] });
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
    }
  });

  const updateLineItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChangeOrderLineItem.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['coLineItems', selectedCO?.id] });
      const previousLineItems = queryClient.getQueryData(['coLineItems', selectedCO?.id]);
      queryClient.setQueryData(['coLineItems', selectedCO?.id], (old = []) =>
        old.map(li => li.id === id ? { ...li, ...data } : li)
      );
      return { previousLineItems };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(['coLineItems', selectedCO?.id], context.previousLineItems);
      toast.error('Failed to update line item');
    },
    onSuccess: () => {
      toast.success('Line item updated');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['coLineItems'] });
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
    }
  });

  const calculateCOTotals = (co) => {
    const items = lineItems.filter(li => li.change_order_id === co.id);
    const credits = items.filter(i => i.type === 'credit').reduce((sum, i) => sum + (i.price || 0), 0);
    const charges = items.filter(i => i.type === 'charge').reduce((sum, i) => sum + (i.price || 0), 0);
    return { credits, charges, net: charges - credits };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#E5E7EB]">Change Orders (PM Estimating)</h1>
          <p className="text-sm text-[#9CA3AF]">CO Backup, Pricing, & Cost Tracking</p>
        </div>
        <div className="flex items-center gap-4">
          <PMProjectSelector />
          <Button onClick={() => setShowCODialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Change Order
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {changeOrders.map(co => {
          const totals = calculateCOTotals(co);
          return (
            <Card key={co.id} className="cursor-pointer hover:border-[rgba(255,157,66,0.3)]" onClick={() => setSelectedCO(co)}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>CO #{co.co_number} - {co.title}</CardTitle>
                    <p className="text-sm text-[#9CA3AF] mt-1">{co.description}</p>
                  </div>
                  <Select value={co.status} onValueChange={(v) => updateCOMutation.mutate({ id: co.id, data: { status: v } })}>
                    <SelectTrigger className="w-36" onClick={(e) => e.stopPropagation()}>
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
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-[#6B7280]">Credits</p>
                    <p className="text-lg font-semibold text-green-500 flex items-center gap-1">
                      <TrendingDown className="w-4 h-4" />
                      ${totals.credits.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#6B7280]">Charges</p>
                    <p className="text-lg font-semibold text-[#FF9D42] flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      ${totals.charges.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#6B7280]">Net Total</p>
                    <p className={`text-lg font-semibold ${totals.net >= 0 ? 'text-[#FF9D42]' : 'text-green-500'}`}>
                      ${Math.abs(totals.net).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#6B7280]">Line Items</p>
                    <p className="text-lg font-semibold">{lineItems.filter(li => li.change_order_id === co.id).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {changeOrders.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-[#6B7280]">
              No change orders yet. Click "New Change Order" to create one.
            </CardContent>
          </Card>
        )}
      </div>

      {selectedCO && (
        <Dialog open={!!selectedCO} onOpenChange={() => setSelectedCO(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>CO #{selectedCO.co_number} - {selectedCO.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Button onClick={() => setShowLineItemDialog(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Line Item
              </Button>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {lineItems.map((item, idx) => (
                  <div key={item.id} className="p-3 border border-[rgba(255,255,255,0.05)] rounded hover:border-[rgba(255,157,66,0.2)]">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-[#6B7280]">#{item.item_number || idx + 1}</span>
                          <Select value={item.type} onValueChange={(v) => updateLineItemMutation.mutate({ id: item.id, data: { type: v } })}>
                            <SelectTrigger className="w-24 h-7">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="charge">Charge</SelectItem>
                              <SelectItem value="credit">Credit</SelectItem>
                            </SelectContent>
                          </Select>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateLineItemMutation.mutate({ id: item.id, data: { description: e.target.value } })}
                            className="flex-1 bg-transparent border-none outline-none font-medium"
                          />
                        </div>
                        <div className="grid grid-cols-5 gap-2 mt-2 text-xs">
                          <Input
                            type="number"
                            value={item.shop_hours || 0}
                            onChange={(e) => updateLineItemMutation.mutate({ id: item.id, data: { shop_hours: Number(e.target.value) } })}
                            className="h-7 text-xs"
                            placeholder="Shop hrs"
                          />
                          <Input
                            type="number"
                            value={item.field_hours || 0}
                            onChange={(e) => updateLineItemMutation.mutate({ id: item.id, data: { field_hours: Number(e.target.value) } })}
                            className="h-7 text-xs"
                            placeholder="Field hrs"
                          />
                          <Input
                            type="number"
                            value={item.weight_tons || 0}
                            onChange={(e) => updateLineItemMutation.mutate({ id: item.id, data: { weight_tons: Number(e.target.value) } })}
                            className="h-7 text-xs"
                            placeholder="Tons"
                          />
                          <Input
                            type="number"
                            value={item.total_cost || 0}
                            onChange={(e) => updateLineItemMutation.mutate({ id: item.id, data: { total_cost: Number(e.target.value) } })}
                            className="h-7 text-xs"
                            placeholder="Cost"
                          />
                          <Input
                            type="number"
                            value={item.price || 0}
                            onChange={(e) => updateLineItemMutation.mutate({ id: item.id, data: { price: Number(e.target.value) } })}
                            className="h-7 text-xs font-semibold"
                            placeholder="Price"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}