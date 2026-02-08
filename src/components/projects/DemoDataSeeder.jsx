import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DemoDataSeeder() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.filter({ status: 'in_progress' })
  });

  const seedMutation = useMutation({
    mutationFn: (/** @type {string} */ projectId) =>
      base44.functions.invoke('seedDemoData', { project_id: projectId }),
    onSuccess: (res) => {
      const data = res.data;
      if (data.success) {
        toast.success(`Seeded: ${data.created.crews} crews, ${data.created.labor_entries} labor entries, ${data.created.equipment_logs} equipment logs`);
        queryClient.invalidateQueries({ queryKey: ['crews'] });
        queryClient.invalidateQueries({ queryKey: ['laborEntries'] });
        queryClient.invalidateQueries({ queryKey: ['equipmentLogs'] });
      } else {
        toast.info(data.message);
      }
    },
    onError: (/** @type {any} */ err) => toast.error(err.message)
  });

  const handleSeed = () => {
    if (!selectedProjectId) {
      toast.error('Select a project');
      return;
    }
    seedMutation.mutate(selectedProjectId);
  };

  return (
    <Card className="bg-amber-900/20 border border-amber-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertCircle size={16} className="text-amber-500" />
          Load Demo Labor & Equipment Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-zinc-400">
          Populate crews, daily labor entries (14 days), and equipment logs for dashboard testing. Safe: skips if data exists.
        </p>

        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="Select project..." />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.project_number})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleSeed}
          disabled={seedMutation.isPending || !selectedProjectId}
          className="w-full bg-amber-600 hover:bg-amber-700"
        >
          {seedMutation.isPending ? (
            <>
              <Loader2 size={14} className="mr-2 animate-spin" />
              Seeding...
            </>
          ) : (
            <>
              <CheckCircle2 size={14} className="mr-2" />
              Load Demo Data
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
