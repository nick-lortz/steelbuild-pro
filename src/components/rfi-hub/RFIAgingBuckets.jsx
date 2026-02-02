import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RFIAgingBuckets({ rfis, detailed }) {
  const buckets = useMemo(() => {
    const now = new Date();
    const result = {
      '1-7': [],
      '8-14': [],
      '15-30': [],
      '30+': []
    };

    rfis.forEach(rfi => {
      if (!rfi.submitted_date || ['closed', 'answered'].includes(rfi.status)) return;
      
      const daysSince = Math.floor((now - new Date(rfi.submitted_date)) / (1000 * 60 * 60 * 24));
      
      if (daysSince <= 7) result['1-7'].push(rfi);
      else if (daysSince <= 14) result['8-14'].push(rfi);
      else if (daysSince <= 30) result['15-30'].push(rfi);
      else result['30+'].push(rfi);
    });

    return result;
  }, [rfis]);

  if (!detailed) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base uppercase tracking-wider">Aging Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(buckets).map(([range, items]) => (
              <div key={range}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-zinc-400">{range} days</span>
                  <Badge className={getAgingColor(range)}>
                    {items.length}
                  </Badge>
                </div>
                <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getAgingBarColor(range)}`}
                    style={{ width: `${Math.min((items.length / rfis.length) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(buckets).map(([range, items]) => (
        <Card key={range} className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="uppercase tracking-wider">{range} Days</span>
              <Badge className={getAgingColor(range)}>
                {items.length} RFIs
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-sm text-zinc-600 italic">No RFIs in this range</p>
            ) : (
              <div className="space-y-2">
                {items.map(rfi => (
                  <div key={rfi.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate mb-1">{rfi.subject}</p>
                        <p className="text-xs text-zinc-500 font-mono">RFI-{rfi.rfi_number}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={getPriorityBadge(rfi.priority)}>
                          {rfi.priority}
                        </Badge>
                        <span className="text-xs text-zinc-500">
                          {Math.floor((new Date() - new Date(rfi.submitted_date)) / (1000 * 60 * 60 * 24))}d
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function getAgingColor(range) {
  switch(range) {
    case '1-7': return 'bg-green-700 text-green-100';
    case '8-14': return 'bg-yellow-700 text-yellow-100';
    case '15-30': return 'bg-amber-700 text-amber-100';
    default: return 'bg-red-700 text-red-100';
  }
}

function getAgingBarColor(range) {
  switch(range) {
    case '1-7': return 'bg-green-500';
    case '8-14': return 'bg-yellow-500';
    case '15-30': return 'bg-amber-500';
    default: return 'bg-red-500';
  }
}

function getPriorityBadge(priority) {
  switch(priority) {
    case 'critical': return 'bg-red-700 text-red-100';
    case 'high': return 'bg-amber-700 text-amber-100';
    case 'medium': return 'bg-blue-700 text-blue-100';
    default: return 'bg-zinc-700 text-zinc-300';
  }
}