import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AutomatedReportScheduler() {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle>Automated Report Scheduler</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <p className="text-zinc-500 mb-4">Configure automated report scheduling</p>
          <Badge variant="outline">Coming Soon</Badge>
        </div>
      </CardContent>
    </Card>
  );
}