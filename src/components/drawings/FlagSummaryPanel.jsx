import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle } from 'lucide-react';

export default function FlagSummaryPanel({ extracted }) {
  if (!extracted || extracted.flag_count === 0) {
    return null;
  }

  const p0Categories = extracted.flag_summary?.p0_categories || [];
  const p1Categories = extracted.flag_summary?.p1_categories || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Issue Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* P0 Categories */}
        {p0Categories.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-red-500" />
              <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">
                Critical Issues ({extracted.p0_count})
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {p0Categories.map((cat) => (
                <Badge key={cat} className="bg-red-600 text-white text-xs">
                  {cat.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* P1 Categories */}
        {p1Categories.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-yellow-500" />
              <span className="text-xs font-semibold text-yellow-500 uppercase tracking-wider">
                Warnings ({extracted.p1_count})
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {p1Categories.map((cat) => (
                <Badge key={cat} className="bg-yellow-600 text-white text-xs">
                  {cat.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}