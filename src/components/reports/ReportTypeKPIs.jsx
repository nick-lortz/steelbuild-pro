import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

export default function ReportTypeKPIs() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {['Financial', 'Progress', 'Safety', 'Quality'].map((type) => (
        <Card key={type} className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-sm text-zinc-500 mb-2">{type} Reports</div>
            <div className="text-2xl font-bold text-white">—</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}