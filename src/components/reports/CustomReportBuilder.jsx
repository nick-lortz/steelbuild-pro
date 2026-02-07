import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CustomReportBuilder() {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle>Custom Report Builder</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <p className="text-zinc-500 mb-4">Build custom reports with your selected metrics</p>
          <Badge variant="outline">Coming Soon</Badge>
        </div>
      </CardContent>
    </Card>
  );
}