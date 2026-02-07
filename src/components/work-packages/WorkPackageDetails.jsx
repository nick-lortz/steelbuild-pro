import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Check, X } from 'lucide-react';

export default function WorkPackageDetails({ pkg, onUpdate, onDelete }) {
  const [editingOverview, setEditingOverview] = useState(false);
  const [overviewData, setOverviewData] = useState({
    title: pkg.title,
    status: pkg.status,
    progress_percent: pkg.progress_percent,
    target_completion: pkg.target_completion,
    lead_engineer: pkg.lead_engineer,
    notes: pkg.notes
  });

  return (
    <Tabs defaultValue="overview" className="mt-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="budget">Budget</TabsTrigger>
        <TabsTrigger value="ai">AI Insights</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        {editingOverview ? (
          <>
            <div><Label>Title</Label><Input value={overviewData.title} onChange={(e) => setOverviewData({ ...overviewData, title: e.target.value })} /></div>
            <div><Label>Status</Label><Select value={overviewData.status} onValueChange={(v) => setOverviewData({ ...overviewData, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not_started">Not Started</SelectItem><SelectItem value="detailing">Detailing</SelectItem><SelectItem value="fabrication">Fabrication</SelectItem><SelectItem value="shipped">Shipped</SelectItem><SelectItem value="installed">Installed</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select></div>
            <div><Label>Progress (%)</Label><Input type="number" min="0" max="100" value={overviewData.progress_percent} onChange={(e) => setOverviewData({ ...overviewData, progress_percent: e.target.value })} /></div>
            <div><Label>Target Completion</Label><Input type="date" value={overviewData.target_completion || ''} onChange={(e) => setOverviewData({ ...overviewData, target_completion: e.target.value })} /></div>
            <div><Label>Lead Engineer</Label><Input value={overviewData.lead_engineer || ''} onChange={(e) => setOverviewData({ ...overviewData, lead_engineer: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={overviewData.notes || ''} onChange={(e) => setOverviewData({ ...overviewData, notes: e.target.value })} rows={3} /></div>
            <div className="flex gap-2 pt-2"><Button onClick={() => { onUpdate({ ...overviewData, progress_percent: Number(overviewData.progress_percent) }); setEditingOverview(false); }} className="flex-1"><Check className="h-4 w-4 mr-2" />Save</Button><Button variant="outline" onClick={() => setEditingOverview(false)} className="flex-1"><X className="h-4 w-4 mr-2" />Cancel</Button></div>
          </>
        ) : (
          <>
            <div><p className="text-sm font-medium mb-2">Package</p><p className="text-lg font-bold">{pkg.title}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm font-medium mb-2">Status</p><Badge className="capitalize">{pkg.status?.replace('_', ' ')}</Badge></div>
              <div><p className="text-sm font-medium mb-2">Progress</p><div className="flex items-center gap-2"><div className="flex-1 bg-muted rounded-full h-2"><div className="h-2 rounded-full bg-green-500" style={{ width: `${pkg.progress_percent || 0}%` }} /></div><span className="text-sm font-bold">{pkg.progress_percent || 0}%</span></div></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm font-medium mb-2">Target</p><p className="text-sm">{pkg.target_completion ? new Date(pkg.target_completion).toLocaleDateString() : 'Not set'}</p></div>
              <div><p className="text-sm font-medium mb-2">Lead</p><p className="text-sm">{pkg.lead_engineer || 'Unassigned'}</p></div>
            </div>
            {pkg.notes && <div><p className="text-sm font-medium mb-2">Notes</p><p className="text-sm text-muted-foreground">{pkg.notes}</p></div>}
            <div className="flex gap-2 pt-4 border-t"><Button variant="outline" size="sm" onClick={() => setEditingOverview(true)}><Edit className="h-3 w-3 mr-2" />Edit</Button><Button variant="destructive" size="sm" onClick={onDelete}><Trash2 className="h-3 w-3 mr-2" />Delete</Button></div>
          </>
        )}
      </TabsContent>

      <TabsContent value="budget"><Card><CardContent className="pt-4"><div className="space-y-2"><div className="flex justify-between"><span className="text-sm">Budget:</span><span className="font-bold">${((pkg.budget_allocated || 0) / 1000).toFixed(0)}K</span></div><div className="flex justify-between"><span className="text-sm">Spent:</span><span className="font-bold text-red-500">${((pkg.actual_spend || 0) / 1000).toFixed(0)}K</span></div></div></CardContent></Card></TabsContent>

      <TabsContent value="ai"><Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">AI insights will appear here</p></CardContent></Card></TabsContent>
    </Tabs>
  );
}