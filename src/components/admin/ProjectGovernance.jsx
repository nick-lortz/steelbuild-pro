import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DataTable from '@/components/ui/DataTable';
import { Archive, Lock } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function ProjectGovernance() {
  const [defaultMarkup, setDefaultMarkup] = useState(15);
  const [coNumberFormat, setCoNumberFormat] = useState('CO-{project}-{number}');

  const { data: projects = [] } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const columns = [
    { header: 'Project #', accessor: 'project_number' },
    { header: 'Name', accessor: 'name' },
    { header: 'Status', accessor: 'status', render: (row) => <span className="capitalize">{row.status}</span> },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="text-amber-400">
            <Archive size={14} className="mr-1" />
            Archive
          </Button>
          <Button variant="ghost" size="sm" className="text-blue-400">
            <Lock size={14} className="mr-1" />
            Lock
          </Button>
        </div>
      )
    }
  ];

  const handleSave = () => {
    toast.success('Governance settings saved');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold">Project Governance</h3>
        <p className="text-sm text-muted-foreground">Configure project templates and defaults</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Financial Defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Default OH&P Markup (%)</Label>
              <Input
                type="number"
                value={defaultMarkup}
                onChange={(e) => setDefaultMarkup(Number(e.target.value))}
              />
            </div>
            <Button onClick={handleSave} className="w-full">Save Settings</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Order Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>CO Numbering Format</Label>
              <Input
                value={coNumberFormat}
                onChange={(e) => setCoNumberFormat(e.target.value)}
                placeholder="CO-{project}-{number}"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variables: {'{project}'}, {'{number}'}, {'{year}'}
              </p>
            </div>
            <Button onClick={handleSave} className="w-full">Save Settings</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Archive & Lock</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={projects.filter(p => p.status === 'completed')}
            emptyMessage="No completed projects to manage"
          />
        </CardContent>
      </Card>
    </div>
  );
}