import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STANDARD_COST_CODES = [
  { code: '01', name: 'Detailing', category: 'labor' },
  { code: '02', name: 'AB/Embeds', category: 'material' },
  { code: '03', name: 'Joists', category: 'material' },
  { code: '04', name: 'Deck', category: 'material' },
  { code: '05', name: 'Material', category: 'material' },
  { code: '06', name: 'Shop Labor & Fabrication', category: 'labor' },
  { code: '07', name: 'Field Labor - Structural', category: 'labor' },
  { code: '08', name: 'Field Labor - Misc.', category: 'labor' },
  { code: '09', name: 'Equipment', category: 'equipment' },
  { code: '10', name: 'Shipping', category: 'subcontract' },
  { code: '11', name: 'Deck Install', category: 'labor' },
  { code: '12', name: 'Special Coatings', category: 'material' },
  { code: '13', name: 'Misc.', category: 'other' },
  { code: '14', name: 'Change Orders', category: 'other' },
  { code: '15', name: 'PM/Admin', category: 'labor' }
];

const CATEGORY_COLORS = {
  labor: 'bg-blue-500/20 text-blue-400',
  material: 'bg-amber-500/20 text-amber-400',
  equipment: 'bg-purple-500/20 text-purple-400',
  subcontract: 'bg-green-500/20 text-green-400',
  other: 'bg-zinc-500/20 text-zinc-400'
};

export default function CostCodeManager() {
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);

  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: () => apiClient.entities.CostCode.list('code')
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (codes) => {
      const existing = new Set(costCodes.map(c => c.code));
      const toCreate = codes.filter(cc => !existing.has(cc.code));
      
      if (toCreate.length === 0) {
        throw new Error('All cost codes already exist');
      }

      return await apiClient.entities.CostCode.bulkCreate(toCreate);
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['cost-codes'] });
      toast.success(`Imported ${created.length} cost codes`);
      setImporting(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setImporting(false);
    }
  });

  const handleBulkImport = async () => {
    setImporting(true);
    bulkCreateMutation.mutate(STANDARD_COST_CODES);
  };

  const missingCodes = STANDARD_COST_CODES.filter(
    sc => !costCodes.find(cc => cc.code === sc.code)
  );

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-widest">Standard Cost Codes</CardTitle>
          <Badge variant="outline" className="text-xs">
            {costCodes.length}/{STANDARD_COST_CODES.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {missingCodes.length > 0 ? (
          <div>
            <p className="text-xs text-zinc-400 mb-3">
              {missingCodes.length} cost code{missingCodes.length !== 1 ? 's' : ''} missing
            </p>
            <Button
              onClick={handleBulkImport}
              disabled={importing}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white text-sm h-9"
            >
              {importing ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={14} className="mr-2" />
                  Bulk Import Standard Codes
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-sm font-semibold text-green-400">All codes initialized</p>
            <p className="text-xs text-zinc-500 mt-1">Ready to use</p>
          </div>
        )}

        {/* Display all codes */}
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Available Codes</p>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {STANDARD_COST_CODES.map(cc => {
              const exists = costCodes.find(existing => existing.code === cc.code);
              return (
                <div
                  key={cc.code}
                  className={`p-2 rounded text-[11px] ${
                    exists
                      ? 'bg-zinc-800 text-zinc-300'
                      : 'bg-zinc-950 text-zinc-500'
                  }`}
                >
                  <div className="font-mono font-semibold">{cc.code}</div>
                  <div className="text-[10px] mt-0.5">{cc.name}</div>
                  <Badge className={`${CATEGORY_COLORS[cc.category]} text-[9px] mt-1`}>
                    {cc.category}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}