import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FieldIssueForm from '@/components/field/FieldIssueForm';
import FieldIssuesDashboard from '@/components/field/FieldIssuesDashboard';
import { AlertCircle, BarChart3 } from 'lucide-react';

export default function FieldTools() {
  const { activeProjectId } = useActiveProject();
  const [showSuccess, setShowSuccess] = useState(false);

  if (!activeProjectId) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500">Select a project to access field tools</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-2xl">Field Tools</CardTitle>
          <p className="text-xs text-zinc-400 mt-1">
            Capture field issues in real-time. Close the loop between field, detail, and fabrication.
          </p>
        </CardHeader>
      </Card>

      {/* Success Message */}
      {showSuccess && (
        <div className="p-3 bg-green-950/40 border border-green-800 rounded text-sm text-green-300">
          ✓ Issue logged successfully
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="log" className="w-full">
        <TabsList className="bg-zinc-800 border-zinc-700 grid w-full grid-cols-2">
          <TabsTrigger value="log" className="flex items-center gap-2">
            <AlertCircle size={16} />
            Log Issue
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 size={16} />
            Dashboard
          </TabsTrigger>
        </TabsList>

        {/* Log Issue Tab */}
        <TabsContent value="log" className="mt-4">
          <FieldIssueForm
            projectId={activeProjectId}
            onSuccess={() => {
              setShowSuccess(true);
              setTimeout(() => setShowSuccess(false), 3000);
            }}
          />
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-4">
          <FieldIssuesDashboard projectId={activeProjectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}