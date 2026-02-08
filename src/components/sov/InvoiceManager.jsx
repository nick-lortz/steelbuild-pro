import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import DataTable from '@/components/ui/DataTable';
import { Plus, CheckCircle, FileText, Eye, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";

export default function InvoiceManager({ projectId, canEdit }) {
  const queryClient = useQueryClient();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showLinesDialog, setShowLinesDialog] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  // Reset dates when dialog opens
  React.useEffect(() => {
    if (showGenerateDialog) {
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      setPeriodStart(lastMonth.toISOString().split('T')[0]);
      setPeriodEnd(lastMonthEnd.toISOString().split('T')[0]);
    }
  }, [showGenerateDialog]);

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', projectId],
    queryFn: () => apiClient.entities.Invoice.filter({ project_id: projectId }, '-period_end'),
    enabled: !!projectId
  });

  const { data: invoiceLines = [] } = useQuery({
    queryKey: ['invoice-lines', selectedInvoiceId],
    queryFn: () => apiClient.entities.InvoiceLine.filter({ invoice_id: selectedInvoiceId }),
    enabled: !!selectedInvoiceId
  });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', projectId],
    queryFn: () => apiClient.entities.SOVItem.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const generateMutation = useMutation({
    mutationFn: (data) => apiClient.functions.invoke('generateInvoice', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-lines'] });
      toast.success('Invoice generated');
      setShowGenerateDialog(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to generate invoice');
    }
  });

  const approveMutation = useMutation({
    mutationFn: (invoice_id) => apiClient.functions.invoke('approveInvoice', { invoice_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['sov-items'] });
      toast.success('Invoice approved, SOV updated');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => apiClient.entities.Invoice.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.functions.invoke('deleteInvoice', { invoice_id: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-lines'] });
      toast.success('Draft invoice deleted');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete invoice');
    }
  });

  const handleGenerate = () => {
    generateMutation.mutate({ project_id: projectId, period_start: periodStart, period_end: periodEnd });
  };

  const handleViewLines = (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
    setShowLinesDialog(true);
  };

  const getSovDescription = (sovId) => sovItems.find(s => s.id === sovId)?.description || 'Unknown';

  const invoiceColumns = [
    {
      header: 'Period',
      accessor: 'period',
      render: (row) => (
        <span className="text-sm">
          {format(new Date(row.period_start), 'MMM d')} - {format(new Date(row.period_end), 'MMM d, yyyy')}
        </span>
      )
    },
    {
      header: 'Total Amount',
      accessor: 'total_amount',
      render: (row) => <span className="font-semibold">${(row.total_amount || 0).toFixed(2).toLocaleString()}</span>
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        const colors = {
          draft: 'bg-zinc-500/20 text-zinc-400',
          submitted: 'bg-blue-500/20 text-blue-400',
          approved: 'bg-green-500/20 text-green-400',
          paid: 'bg-purple-500/20 text-purple-400'
        };
        return <Badge className={colors[row.status]}>{row.status}</Badge>;
      }
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewLines(row.id)}
          >
            <Eye size={16} className="mr-1" />
            Lines
          </Button>
          {row.status === 'draft' && canEdit && (
            <>
              <Button
                size="sm"
                onClick={() => {
                  if (window.confirm(`⚠️ Approve Invoice for ${format(new Date(row.period_end), 'MMM yyyy')}?\n\nThis will:\n• Lock all billed/earned amounts\n• Update SOV progress permanently\n• Make invoice read-only\n\nThis action cannot be undone.`)) {
                    approveMutation.mutate(row.id);
                  }
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle size={16} className="mr-1" />
                Approve
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (window.confirm(`Delete draft invoice for ${format(new Date(row.period_end), 'MMM yyyy')}?`)) {
                    deleteMutation.mutate(row.id);
                  }
                }}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 size={16} />
              </Button>
            </>
          )}
          {row.status === 'approved' && canEdit && (
            <Button
              size="sm"
              onClick={() => updateStatusMutation.mutate({ id: row.id, status: 'paid' })}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Mark Paid
            </Button>
          )}
        </div>
      )
    }
  ];

  const lineColumns = [
   {
     header: 'SOV Item',
     accessor: 'sov_item_id',
     render: (row) => <span className="text-sm">{getSovDescription(row.sov_item_id)}</span>
   },
   {
     header: 'Scheduled',
     accessor: 'scheduled_value',
     render: (row) => <span>${(row.scheduled_value || 0).toFixed(2).toLocaleString()}</span>
   },
   {
     header: 'Previous',
     accessor: 'previous_billed',
     render: (row) => <span>${(row.previous_billed || 0).toFixed(2).toLocaleString()}</span>
   },
   {
     header: '% Complete',
     accessor: 'current_percent',
     render: (row) => <span className="font-semibold">{row.current_percent.toFixed(1)}%</span>
   },
   {
     header: 'This Period',
     accessor: 'current_billed',
     render: (row) => <span className="text-amber-400 font-bold">${(row.current_billed || 0).toFixed(2).toLocaleString()}</span>
   },
   {
     header: 'Total Billed',
     accessor: 'billed_to_date',
     render: (row) => <span>${(row.billed_to_date || 0).toFixed(2).toLocaleString()}</span>
   },
   {
     header: 'Remaining',
     accessor: 'remaining_value',
     render: (row) => <span className="text-muted-foreground">${(row.remaining_value || 0).toFixed(2).toLocaleString()}</span>
   },
   {
     header: 'Docs',
     accessor: 'attachments',
     render: (row) => (
       <span className="text-xs text-zinc-500">
         {row.attachments?.length || 0} file(s)
       </span>
     )
   }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold">Invoices</h3>
        <Button onClick={() => setShowGenerateDialog(true)} disabled={!canEdit} size="sm">
          <Plus size={16} className="mr-1" />
          Generate Invoice
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <DataTable
            columns={invoiceColumns}
            data={invoices}
            emptyMessage="No invoices generated. Create an invoice from current SOV progress."
          />
        </CardContent>
      </Card>

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Invoice will freeze current % complete and calculate billing amounts based on SOV progress.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div>
                <Label>Period End</Label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
              <Button
                onClick={handleGenerate}
                disabled={!periodStart || !periodEnd || generateMutation.isPending}
              >
                {generateMutation.isPending ? 'Generating...' : 'Generate Invoice'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLinesDialog} onOpenChange={setShowLinesDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Invoice Lines (Frozen)</DialogTitle>
          </DialogHeader>
          <DataTable
            columns={lineColumns}
            data={invoiceLines}
            emptyMessage="No lines in this invoice"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}