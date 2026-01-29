import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Link as LinkIcon, DollarSign, Clock, History, MessageSquare, Upload, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';
import VersionHistory from './VersionHistory';
import DocumentManager from './DocumentManager';
import LinkagePanel from './LinkagePanel';
import ApprovalWorkflow from './ApprovalWorkflow';
import AIImpactAnalysis from './AIImpactAnalysis';
import CommentsThread from './CommentsThread';

export default function ChangeOrderDetail({ changeOrder, projects, onUpdate, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  
  const project = projects.find(p => p.id === changeOrder.project_id);
  const costImpact = changeOrder.cost_impact || 0;
  const scheduleImpact = changeOrder.schedule_impact_days || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold">
              CO-{String(changeOrder.co_number).padStart(3, '0')}
            </h2>
            <StatusBadge status={changeOrder.status} />
            {changeOrder.version > 1 && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                v{changeOrder.version}
              </Badge>
            )}
          </div>
          <h3 className="text-xl text-zinc-300">{changeOrder.title}</h3>
          <p className="text-sm text-zinc-500 mt-1">{project?.name}</p>
        </div>
      </div>

      {/* Impact Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
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

        <Card className="bg-zinc-900 border-zinc-800">
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-800 border-zinc-700 grid grid-cols-6">
          <TabsTrigger value="overview">
            <FileText size={14} className="mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="linkage">
            <LinkIcon size={14} className="mr-2" />
            Links
          </TabsTrigger>
          <TabsTrigger value="documents">
            <Upload size={14} className="mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="approval">
            Approval
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Sparkles size={14} className="mr-2" />
            AI
          </TabsTrigger>
          <TabsTrigger value="history">
            <History size={14} className="mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-300 whitespace-pre-wrap">
                {changeOrder.description || 'No description provided'}
              </p>
            </CardContent>
          </Card>

          {changeOrder.sov_allocations?.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">SOV Allocations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {changeOrder.sov_allocations.map((alloc, idx) => (
                    <div key={idx} className="flex justify-between items-start p-3 bg-zinc-800/50 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alloc.description}</p>
                      </div>
                      <p className="text-sm font-bold text-amber-400">
                        ${parseFloat(alloc.amount).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <CommentsThread 
            changeOrder={changeOrder}
            onUpdate={onUpdate}
          />
        </TabsContent>

        <TabsContent value="linkage">
          <LinkagePanel 
            changeOrder={changeOrder}
            onUpdate={onUpdate}
          />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentManager 
            changeOrder={changeOrder}
            onUpdate={onUpdate}
          />
        </TabsContent>

        <TabsContent value="approval">
          <ApprovalWorkflow
            changeOrder={changeOrder}
            onApprovalComplete={onUpdate}
          />
        </TabsContent>

        <TabsContent value="ai">
          <AIImpactAnalysis
            changeOrderData={changeOrder}
            projectId={changeOrder.project_id}
            onAnalysisComplete={(analysis) => {
              onUpdate({ ...changeOrder, ai_analysis: analysis });
            }}
          />
        </TabsContent>

        <TabsContent value="history">
          <VersionHistory 
            changeOrder={changeOrder}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}