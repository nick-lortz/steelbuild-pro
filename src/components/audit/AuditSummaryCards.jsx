import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, FileWarning, CheckCircle2 } from 'lucide-react';

export default function AuditSummaryCards({ counts }) {
  if (!counts) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardContent className="p-4">
          <div className="text-xs text-zinc-500 mb-1">Total Issues</div>
          <div className="text-2xl font-bold text-white">{counts.total || 0}</div>
        </CardContent>
      </Card>
      <Card className="bg-red-900/20 border-red-700/30">
        <CardContent className="p-4">
          <div className="text-xs text-red-300 mb-1">Critical</div>
          <div className="text-2xl font-bold text-white">{counts.critical || 0}</div>
        </CardContent>
      </Card>
      <Card className="bg-orange-900/20 border-orange-700/30">
        <CardContent className="p-4">
          <div className="text-xs text-orange-300 mb-1">High</div>
          <div className="text-2xl font-bold text-white">{counts.high || 0}</div>
        </CardContent>
      </Card>
      <Card className="bg-amber-900/20 border-amber-700/30">
        <CardContent className="p-4">
          <div className="text-xs text-amber-300 mb-1">Medium</div>
          <div className="text-2xl font-bold text-white">{counts.medium || 0}</div>
        </CardContent>
      </Card>
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardContent className="p-4">
          <div className="text-xs text-zinc-500 mb-1">Low</div>
          <div className="text-2xl font-bold text-white">{counts.low || 0}</div>
        </CardContent>
      </Card>
      <Card className="bg-green-900/20 border-green-700/30">
        <CardContent className="p-4">
          <div className="text-xs text-green-300 mb-1">Auto-Fixed</div>
          <div className="text-2xl font-bold text-white">{counts.auto_fixed || 0}</div>
        </CardContent>
      </Card>
    </div>
  );
}