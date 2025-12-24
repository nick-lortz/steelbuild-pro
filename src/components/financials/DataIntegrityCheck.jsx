import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { checkCostCodeIntegrity } from '@/components/shared/dataValidation';

export default function DataIntegrityCheck() {
  const { data: costCodes = [] } = useQuery({
    queryKey: ['costCodes'],
    queryFn: () => base44.entities.CostCode.list(),
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials'],
    queryFn: () => base44.entities.Financial.list(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
  });

  const { data: laborHours = [] } = useQuery({
    queryKey: ['laborHours'],
    queryFn: () => base44.entities.LaborHours.list(),
  });

  const issues = checkCostCodeIntegrity(
    { financials, expenses, laborHours },
    costCodes
  );

  const hasIssues = issues.length > 0;

  return (
    <Card className={`border ${hasIssues ? 'bg-red-500/5 border-red-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield size={18} />
          Data Integrity Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasIssues ? (
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle size={20} />
            <p>All cost code references are valid. No integrity issues detected.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle size={20} />
              <p className="font-medium">{issues.length} integrity issue{issues.length !== 1 ? 's' : ''} found</p>
            </div>
            <div className="space-y-2">
              {issues.map((issue, idx) => (
                <div key={idx} className="p-3 bg-zinc-800/50 rounded border border-zinc-700 text-sm">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                      {issue.type}
                    </Badge>
                    <span className="text-zinc-400 text-xs">ID: {issue.id}</span>
                  </div>
                  <p className="text-zinc-300 mt-2">{issue.issue}</p>
                  <p className="text-zinc-500 text-xs mt-1">Cost Code ID: {issue.costCodeId}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}