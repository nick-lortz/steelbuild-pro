import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataTable from '@/components/ui/DataTable';
import { Download, Search } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { format } from 'date-fns';

export default function ReportingAuditLogs() {
  const [search, setSearch] = useState('');

  const { data: logs = [] } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 100)
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['admin-projects-summary'],
    queryFn: () => base44.entities.Project.list()
  });

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Entity', 'Details'].join(','),
      ...logs.map(log => [
        log.created_date,
        log.created_by,
        log.action,
        log.entity_type,
        log.entity_id
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Audit log exported');
  };

  const filteredLogs = logs.filter(log =>
    log.created_by?.toLowerCase().includes(search.toLowerCase()) ||
    log.action?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'created_date',
      render: (row) => format(new Date(row.created_date), 'MMM d, yyyy h:mm a')
    },
    { header: 'User', accessor: 'created_by' },
    { header: 'Action', accessor: 'action', render: (row) => <span className="capitalize">{row.action}</span> },
    { header: 'Entity Type', accessor: 'entity_type' },
    { header: 'Entity ID', accessor: 'entity_id', render: (row) => <span className="font-mono text-xs">{row.entity_id?.substring(0, 8)}</span> }
  ];

  const activeProjects = projects.filter(p => p.status === 'in_progress').length;
  const totalContract = projects.reduce((sum, p) => sum + (p.contract_value || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold">Reporting & Audit Logs</h3>
        <p className="text-sm text-muted-foreground">System-wide analytics and activity tracking</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active Projects</p>
            <p className="text-2xl font-bold">{activeProjects}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Projects</p>
            <p className="text-2xl font-bold">{projects.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Contract Value</p>
            <p className="text-2xl font-bold">${(totalContract / 1000000).toFixed(1)}M</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Audit Entries</p>
            <p className="text-2xl font-bold">{logs.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Audit Log</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Button variant="outline" onClick={handleExport}>
                <Download size={14} className="mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredLogs}
            emptyMessage="No audit logs found"
          />
        </CardContent>
      </Card>
    </div>
  );
}