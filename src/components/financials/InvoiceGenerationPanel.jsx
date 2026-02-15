import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

const formatCurrency = (value) => {
  if (value == null) return '$0.00';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  return value < 0 ? `( $${formatted} )` : `$${formatted}`;
};

export default function InvoiceGenerationPanel({ 
  readyToBill,
  costCoverage,
  sovItems,
  onGenerate,
  canEdit 
}) {
  const [amount, setAmount] = useState(readyToBill);
  const canInvoice = costCoverage >= 95;

  const handleGenerate = async () => {
    if (!canInvoice) {
      toast.error(`Cost alignment coverage (${costCoverage.toFixed(0)}%) below 95% threshold`);
      return;
    }
    if (amount <= 0) {
      toast.error('Invoice amount must be greater than zero');
      return;
    }
    if (amount > readyToBill) {
      toast.error('Invoice amount cannot exceed Ready to Bill');
      return;
    }

    await onGenerate(amount);
  };

  return (
    <Card className={`border-2 ${canInvoice ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
      <CardHeader className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm">Generate Invoice</CardTitle>
          {!canInvoice && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
              <AlertCircle size={12} className="mr-1" />
              Blocked: Map Costs
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
            <p className="text-[10px] text-zinc-500 uppercase mb-1">Ready to Bill</p>
            <p className="text-lg font-bold text-green-400 font-mono">{formatCurrency(readyToBill)}</p>
          </div>
          <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
            <p className="text-[10px] text-zinc-500 uppercase mb-1">Cost Coverage</p>
            <p className={`text-lg font-bold font-mono ${canInvoice ? 'text-green-400' : 'text-red-400'}`}>
              {costCoverage.toFixed(0)}%
            </p>
          </div>
          <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
            <p className="text-[10px] text-zinc-500 uppercase mb-1">Invoice Amount</p>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="h-8 text-right font-mono font-bold bg-zinc-900 border-zinc-700 text-white"
              disabled={!canEdit}
            />
          </div>
        </div>

        {!canInvoice && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded flex items-start gap-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-red-400 font-semibold mb-1">Invoice generation blocked</p>
              <p className="text-xs text-zinc-400">
                Cost alignment coverage ({costCoverage.toFixed(0)}%) is below the required 95% threshold. 
                Map unaligned costs to SOV lines before generating an invoice.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleGenerate}
            disabled={!canEdit || !canInvoice || amount <= 0}
            className="bg-green-500 hover:bg-green-600 text-white font-bold"
          >
            <FileText size={14} className="mr-2" />
            Generate Invoice for {formatCurrency(amount)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}