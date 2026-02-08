import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function DetailImprovementReviewDashboard({ projectId }) {
  const [expandedId, setExpandedId] = useState(null);
  const queryClient = useQueryClient();

  const { data: improvements = [] } = useQuery({
    queryKey: ['detail-improvements', projectId],
    queryFn: () => base44.entities.DetailImprovement.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  // Approval mutation
  const approveMutation = useMutation({
    mutationFn: async ({ improvement_id, approver_type, approver_email }) => {
      const improvement = improvements.find(i => i.id === improvement_id);
      if (approver_type === 'detailing_lead') {
        return base44.entities.DetailImprovement.update(improvement_id, {
          approved_by_detailing_lead: approver_email,
          approval_date: new Date().toISOString(),
          status: 'approved'
        });
      } else if (approver_type === 'pm') {
        return base44.entities.DetailImprovement.update(improvement_id, {
          approved_by_pm: approver_email,
          approval_date: new Date().toISOString(),
          status: 'approved'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detail-improvements', projectId] });
    }
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ improvement_id, reason }) => {
      return base44.entities.DetailImprovement.update(improvement_id, {
        status: 'rejected',
        rejection_reason: reason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detail-improvements', projectId] });
    }
  });

  // Apply to project mutation
  const applyMutation = useMutation({
    mutationFn: async ({ improvement_id, drawing_set_ids }) => {
      const improvement = improvements.find(i => i.id === improvement_id);
      
      // Create DetailingActions for each drawing set
      const actions = drawing_set_ids.map(drawing_set_id => ({
        project_id: projectId,
        source_detail_improvement_id: improvement_id,
        drawing_set_id,
        detail_ref: improvement.affected_detail_refs?.[0] || 'TBD',
        title: improvement.title,
        required_change: improvement.recommended_change,
        assigned_to: 'unassigned',
        blocking: improvement.schedule_impact_estimate > 0,
        blocks_rff: improvement.evidence_count > 1, // Auto-block RFF if repeat issue
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days
      }));

      await Promise.all(actions.map(action => 
        base44.entities.DetailingAction.create(action)
      ));

      return { actions_created: actions.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detail-improvements', projectId] });
    }
  });

  const pendingReview = improvements.filter(i => i.status === 'draft' || i.status === 'pending_review');
  const approved = improvements.filter(i => i.status === 'approved');
  const rejected = improvements.filter(i => i.status === 'rejected');

  const ImprovementCard = ({ improvement }) => {
    const isExpanded = expandedId === improvement.id;

    return (
      <Card key={improvement.id} className="bg-zinc-900 border-zinc-700 hover:border-zinc-600 transition">
        <CardContent className="pt-4">
          <button
            onClick={() => setExpandedId(isExpanded ? null : improvement.id)}
            className="w-full text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-white text-sm">{improvement.title}</span>
                  <Badge className={
                    improvement.approval_threshold === 'requires_pm_approval'
                      ? 'bg-red-600'
                      : 'bg-green-600'
                  }>
                    {improvement.approval_threshold === 'requires_pm_approval' ? 'PM Review' : 'Lead Approval'}
                  </Badge>
                  {improvement.design_intent_change && (
                    <Badge className="bg-orange-600">Design Intent</Badge>
                  )}
                  {improvement.evidence_count > 1 && (
                    <Badge className="bg-blue-600">{improvement.evidence_count} Repeat</Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-300 line-clamp-2">{improvement.recommended_change}</p>
                <div className="text-xs text-zinc-500 mt-2 space-y-1">
                  <div>Root Cause: <span className="text-zinc-300">{improvement.root_cause.replace(/_/g, ' ')}</span></div>
                  <div>Confidence: <span className="text-zinc-300">{improvement.confidence_score}%</span></div>
                  {improvement.cost_impact_estimate > 0 && (
                    <div>Cost Impact: <span className="text-red-400">${improvement.cost_impact_estimate}</span></div>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <Badge variant="outline" className="text-[10px]">{improvement.status}</Badge>
              </div>
            </div>
          </button>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-zinc-700 space-y-3">
              <div className="text-xs space-y-2">
                <div><strong>Description:</strong> {improvement.description}</div>
                <div><strong>Connection Type:</strong> {improvement.connection_type}</div>
                {improvement.applicability_tags?.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {improvement.applicability_tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>

              {improvement.status === 'draft' && (
                <div className="flex gap-2 mt-4 pt-3 border-t border-zinc-700">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
                    onClick={() => approveMutation.mutate({
                      improvement_id: improvement.id,
                      approver_type: improvement.approval_threshold === 'requires_pm_approval' ? 'pm' : 'detailing_lead',
                      approver_email: 'current@user.email'
                    })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 text-xs"
                    onClick={() => rejectMutation.mutate({
                      improvement_id: improvement.id,
                      reason: 'Rejected by reviewer'
                    })}
                  >
                    Reject
                  </Button>
                </div>
              )}

              {improvement.status === 'approved' && !improvement.linked_revision_ids?.length && (
                <div className="mt-4 pt-3 border-t border-zinc-700">
                  <Button
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-xs"
                    onClick={() => applyMutation.mutate({
                      improvement_id: improvement.id,
                      drawing_set_ids: [] // User selects which drawings
                    })}
                  >
                    Apply to Project
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-zinc-800 border-zinc-700 grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock size={14} />
            Pending ({pendingReview.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle2 size={14} />
            Approved ({approved.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <AlertTriangle size={14} />
            Rejected ({rejected.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-2">
          {pendingReview.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">No improvements pending review</div>
          ) : (
            pendingReview.map(imp => <ImprovementCard key={imp.id} improvement={imp} />)
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4 space-y-2">
          {approved.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">No approved improvements</div>
          ) : (
            approved.map(imp => <ImprovementCard key={imp.id} improvement={imp} />)
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4 space-y-2">
          {rejected.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">No rejected improvements</div>
          ) : (
            rejected.map(imp => <ImprovementCard key={imp.id} improvement={imp} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}