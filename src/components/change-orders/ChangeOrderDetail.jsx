import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Link as LinkIcon, DollarSign, Clock, History, MessageSquare, Upload, Sparkles, Edit, Trash2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/notifications';
import VersionHistory from './VersionHistory';
import LinkagePanel from './LinkagePanel';
import AIImpactAnalysis from './AIImpactAnalysis';

export default function ChangeOrderDetail({ changeOrder, projects, onEdit, onDelete, onUpdate, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();

  const project = projects.find(p => p.id === changeOrder.project_id);
  const costImpact = changeOrder.cost_impact || 0;
  const scheduleImpact = changeOrder.schedule_impact_days || 0;

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', changeOrder.project_id],
    queryFn: () => base44.entities.SOVItem.filter({ project_id: changeOrder.project_id }),
    enabled: !!changeOrder.project_id
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      const comments = changeOrder.comments || [];
      comments.push({
        comment: newComment,
        author: currentUser.email,
        created_at: new Date().toISOString()
      });
      return base44.entities.ChangeOrder.update(changeOrder.id, { comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
      setNewComment('');
      toast.success('Comment added');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      const user = await base44.auth.me();
      const updates = { status: newStatus };
      
      if (newStatus === 'submitted' && !changeOrder.submitted_date) {
        updates.submitted_date = new Date().toISOString().split('T')[0];
      }
      
      if (newStatus === 'approved') {
        updates.approved_date = new Date().toISOString().split('T')[0];
        updates.approved_by = user.full_name || user.email;
      }

      return base44.entities.ChangeOrder.update(changeOrder.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
      toast.success('Status updated');
      onUpdate();
    }
  });

  const getSovDescription = (sovId) => {
    const item = sovItems.find(s => s.id === sovId);
    return item ? `${item.sov_code} - ${item.description}` : 'Unknown SOV';
  };

  const statusColors = {
    draft: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    submitted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    under_review: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    approved: 'bg-green-500/20 text-green-400 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    void: 'bg-zinc-700/20 text-zinc-600 border-zinc-700/30'
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold text-white">
            CO-{String(changeOrder.co_number).padStart(3, '0')}
          </h2>
          <Badge variant="outline" className={statusColors[changeOrder.status]}>
            {changeOrder.status?.toUpperCase()}
          </Badge>
          {changeOrder.version > 1 && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
              v{changeOrder.version}
            </Badge>
          )}
        </div>
        <h3 className="text-xl text-zinc-300">{changeOrder.title}</h3>
        <p className="text-sm text-zinc-500 mt-1">
          {project?.project_number} • {project?.name}
        </p>
      </div>

      {/* Impact Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Cost Impact</p>
                <p className={`text-2xl font-bold ${costImpact >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {costImpact >= 0 ? '+' : ''}${Math.abs(costImpact).toLocaleString()}
                </p>
              </div>
              <DollarSign className={costImpact >= 0 ? 'text-green-500' : 'text-red-500'} size={32} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Schedule Impact</p>
                <p className={`text-2xl font-bold ${scheduleImpact > 0 ? 'text-red-400' : scheduleImpact < 0 ? 'text-green-400' : 'text-zinc-400'}`}>
                  {scheduleImpact > 0 ? '+' : ''}{scheduleImpact} days
                </p>
              </div>
              <Clock className={scheduleImpact > 0 ? 'text-red-500' : 'text-zinc-500'} size={32} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          onClick={onEdit}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          <Edit size={14} className="mr-2" />
          Edit CO
        </Button>
        {changeOrder.status !== 'approved' && currentUser?.role === 'admin' && (
          <Button
            onClick={() => updateStatusMutation.mutate('approved')}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle size={14} className="mr-2" />
            Approve
          </Button>
        )}
        <Button
          variant="outline"
          onClick={onDelete}
          className="border-zinc-700 text-red-400 hover:bg-red-500/10"
        >
          <Trash2 size={14} className="mr-2" />
          Delete
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-800 border-zinc-700 grid grid-cols-5 w-full">
          <TabsTrigger value="overview">
            <FileText size={14} className="mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="linkage">
            <LinkIcon size={14} className="mr-2" />
            Links
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Sparkles size={14} className="mr-2" />
            AI Analysis
          </TabsTrigger>
          <TabsTrigger value="comments">
            <MessageSquare size={14} className="mr-2" />
            Comments
          </TabsTrigger>
          <TabsTrigger value="history">
            <History size={14} className="mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-300 whitespace-pre-wrap text-sm">
                {changeOrder.description || 'No description provided'}
              </p>
            </CardContent>
          </Card>

          {changeOrder.sov_allocations?.length > 0 && (
            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm">SOV Allocations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {changeOrder.sov_allocations.map((alloc, idx) => (
                    <div key={idx} className="flex justify-between items-start p-3 bg-zinc-900/50 rounded">
                      <div className="flex-1">
                        <p className="text-xs font-mono text-amber-500 mb-1">
                          {getSovDescription(alloc.sov_item_id).split('-')[0].trim()}
                        </p>
                        <p className="text-sm text-zinc-300">{alloc.description}</p>
                      </div>
                      <p className="text-sm font-bold text-amber-400">
                        ${parseFloat(alloc.amount || 0).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-2 border-t border-zinc-800">
                    <span className="text-zinc-500 font-semibold">Total:</span>
                    <span className="font-bold text-green-400">
                      ${changeOrder.sov_allocations.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Key Dates */}
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm">Key Dates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-500 text-xs mb-1">Created</p>
                  <p className="text-white">{format(new Date(changeOrder.created_date), 'MMM d, yyyy h:mm a')}</p>
                </div>
                {changeOrder.submitted_date && (
                  <div>
                    <p className="text-zinc-500 text-xs mb-1">Submitted</p>
                    <p className="text-blue-400">{format(new Date(changeOrder.submitted_date), 'MMM d, yyyy')}</p>
                  </div>
                )}
                {changeOrder.approved_date && (
                  <div>
                    <p className="text-zinc-500 text-xs mb-1">Approved</p>
                    <p className="text-green-400">{format(new Date(changeOrder.approved_date), 'MMM d, yyyy')}</p>
                    {changeOrder.approved_by && (
                      <p className="text-xs text-zinc-500 mt-0.5">by {changeOrder.approved_by}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="linkage">
          <LinkagePanel 
            changeOrder={changeOrder}
            onUpdate={onUpdate}
          />
        </TabsContent>

        <TabsContent value="ai">
          <AIImpactAnalysis
            changeOrderData={changeOrder}
            projectId={changeOrder.project_id}
            onAnalysisComplete={(analysis) => {
              base44.entities.ChangeOrder.update(changeOrder.id, { ai_analysis: analysis })
                .then(() => {
                  queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
                  toast.success('AI analysis complete');
                });
            }}
          />
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm">Add Comment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  placeholder="Add a comment..."
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
                <Button
                  size="sm"
                  onClick={() => addCommentMutation.mutate()}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                >
                  Post Comment
                </Button>
              </div>
            </CardContent>
          </Card>

          {changeOrder.comments?.length > 0 && (
            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm">Comments ({changeOrder.comments.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {changeOrder.comments.map((comment, idx) => (
                  <div key={idx} className="p-3 bg-zinc-900/50 rounded">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-semibold text-white">{comment.author}</span>
                      <span className="text-xs text-zinc-500">
                        {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{comment.comment}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <VersionHistory changeOrder={changeOrder} />
        </TabsContent>
      </Tabs>
    </div>
  );
}