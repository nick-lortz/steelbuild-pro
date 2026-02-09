import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, CheckCircle, Clock, AlertTriangle, Wrench } from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import PatternAnalysisPanel from '@/components/detail-improvement/PatternAnalysisPanel';
import DetailImprovementForm from '@/components/detail-improvement/DetailImprovementForm';
import ApprovalWorkflow from '@/components/detail-improvement/ApprovalWorkflow';

export default function FeedbackLoop() {
  const { activeProjectId } = useActiveProject();
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedImprovement, setSelectedImprovement] = useState(null);

  const { data: improvements = [] } = useQuery({
    queryKey: ['detail-improvements', activeProjectId],
    queryFn: () => base44.entities.DetailImprovement.filter(
      { project_id: activeProjectId },
      '-created_date'
    ),
    enabled: !!activeProjectId
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['detailing-actions', activeProjectId],
    queryFn: () => base44.entities.DetailingAction.filter(
      { project_id: activeProjectId },
      '-created_date'
    ),
    enabled: !!activeProjectId
  });

  if (!activeProjectId) {
    return (
      <PageShell>
        <PageHeader
          title="Field → Detail Feedback Loop"
          subtitle="Pattern detection, improvement proposals, execution tracking"
        />
        <div className="text-center py-12 text-zinc-500">
          Select a project to access feedback loop
        </div>
      </PageShell>
    );
  }

  const stats = {
    pending: improvements.filter(i => i.status === 'pending_review').length,
    approved: improvements.filter(i => i.status === 'approved').length,
    actions_open: actions.filter(a => a.status === 'open' || a.status === 'in_progress').length,
    actions_complete: actions.filter(a => a.status === 'complete').length
  };

  return (
    <PageShell>
      <PageHeader
        title="Field → Detail Feedback Loop"
        subtitle="Convert field issues into institutional learning"
      />

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Pending Review</div>
            <div className="text-2xl font-bold text-amber-500">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Approved</div>
            <div className="text-2xl font-bold text-green-500">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Actions Open</div>
            <div className="text-2xl font-bold text-blue-500">{stats.actions_open}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Actions Complete</div>
            <div className="text-2xl font-bold text-white">{stats.actions_complete}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="patterns" className="space-y-6">
        <TabsList className="bg-zinc-800 border border-zinc-700">
          <TabsTrigger value="patterns" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
            <TrendingUp size={16} className="mr-2" />
            Pattern Analysis
          </TabsTrigger>
          <TabsTrigger value="improvements" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
            <CheckCircle size={16} className="mr-2" />
            Improvements
          </TabsTrigger>
          <TabsTrigger value="actions" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
            <Wrench size={16} className="mr-2" />
            Execution
          </TabsTrigger>
        </TabsList>

        <TabsContent value="patterns">
          {showForm ? (
            <DetailImprovementForm
              projectId={activeProjectId}
              pattern={selectedPattern}
              onSuccess={() => {
                setShowForm(false);
                setSelectedPattern(null);
              }}
              onCancel={() => {
                setShowForm(false);
                setSelectedPattern(null);
              }}
            />
          ) : (
            <PatternAnalysisPanel
              projectId={activeProjectId}
              onCreateImprovement={(pattern) => {
                setSelectedPattern(pattern);
                setShowForm(true);
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="improvements">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="text-sm font-semibold text-zinc-400">All Improvements</div>
              {improvements.length === 0 ? (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-8 text-center text-zinc-500">
                    No improvements proposed yet
                  </CardContent>
                </Card>
              ) : (
                improvements.map(imp => (
                  <Card
                    key={imp.id}
                    className="bg-zinc-900 border-zinc-800 cursor-pointer hover:border-zinc-700"
                    onClick={() => setSelectedImprovement(imp)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {imp.status === 'pending_review' && <Clock size={14} className="text-amber-500" />}
                          {imp.status === 'approved' && <CheckCircle size={14} className="text-green-500" />}
                          {imp.status === 'rejected' && <AlertTriangle size={14} className="text-red-500" />}
                          <span className="text-sm font-semibold text-white">{imp.title}</span>
                        </div>
                        <Badge className={
                          imp.status === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          imp.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }>
                          {imp.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="text-xs text-zinc-400">
                        {imp.connection_type.replace(/_/g, ' ')} • {imp.evidence_count} evidence • {imp.confidence_score}% confidence
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div>
              {selectedImprovement ? (
                <div className="space-y-4 sticky top-4">
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <div className="text-xs text-zinc-500 mb-1">Title</div>
                        <div className="text-sm font-semibold text-white">{selectedImprovement.title}</div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500 mb-1">Recommended Change</div>
                        <div className="text-xs text-zinc-300">{selectedImprovement.recommended_change}</div>
                      </div>
                      {selectedImprovement.description && (
                        <div>
                          <div className="text-xs text-zinc-500 mb-1">Description</div>
                          <div className="text-xs text-zinc-400">{selectedImprovement.description}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <ApprovalWorkflow improvement={selectedImprovement} />
                </div>
              ) : (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-8 text-center text-zinc-500">
                    Select an improvement to view details
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="actions">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-8 text-center text-zinc-500">
              Execution actions coming soon
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}