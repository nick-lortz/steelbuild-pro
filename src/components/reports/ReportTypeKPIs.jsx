import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, DollarSign, AlertTriangle, FileCheck, Target, Download, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const REPORT_TYPES = [
  {
    type: 'financial',
    title: 'Financial Reports',
    icon: DollarSign,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    description: 'Budget, actuals, variance, forecast'
  },
  {
    type: 'progress',
    title: 'Progress Reports',
    icon: TrendingUp,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    description: 'Task completion, schedule adherence'
  },
  {
    type: 'safety',
    title: 'Safety Reports',
    icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    description: 'RFIs, change orders, issues'
  },
  {
    type: 'quality',
    title: 'Quality Reports',
    icon: FileCheck,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    description: 'Drawings, submittals, QC'
  },
  {
    type: 'custom',
    title: 'Custom Reports',
    icon: FileText,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    description: 'Customizable data exports'
  }
];

export default function ReportTypeKPIs({ reports = [], onGenerateReport, generatingReport }) {
  const reportCounts = useMemo(() => {
    return REPORT_TYPES.map(rt => ({
      ...rt,
      count: reports.filter(r => r.report_type === rt.type).length,
      activeCount: reports.filter(r => r.report_type === rt.type && r.active).length,
      lastRun: reports
        .filter(r => r.report_type === rt.type && r.last_run)
        .sort((a, b) => new Date(b.last_run) - new Date(a.last_run))[0]?.last_run
    }));
  }, [reports]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {reportCounts.map(report => {
        const Icon = report.icon;
        const mostRecent = reports.find(r => r.report_type === report.type && r.active);
        
        return (
          <Card key={report.type} className={`${report.bgColor} border ${report.borderColor}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Icon size={20} className={report.color} />
                <Badge variant="outline" className="text-[10px]">
                  {report.activeCount}/{report.count}
                </Badge>
              </div>
              <CardTitle className="text-sm mt-2">{report.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {report.description}
              </p>
              
              {report.lastRun && (
                <p className="text-[10px] text-muted-foreground">
                  Last: {new Date(report.lastRun).toLocaleDateString()}
                </p>
              )}

              {mostRecent && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => onGenerateReport(mostRecent, 'csv')}
                  disabled={generatingReport === mostRecent.id}
                >
                  {generatingReport === mostRecent.id ? (
                    <>
                      <Loader2 size={12} className="mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download size={12} className="mr-1" />
                      Quick Export
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}