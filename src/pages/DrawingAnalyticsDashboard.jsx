import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import ContentSection from '@/components/layout/ContentSection';
import LoadingState from '@/components/layout/LoadingState';
import { FileText, GitCompare, AlertTriangle, Target, MapPin, Clock, TrendingUp, Eye } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { differenceInDays, parseISO, format } from 'date-fns';

const COLORS = ['#FF6B2C', '#FF9D42', '#FFB84D', '#3B82F6', '#60A5FA', '#93C5FD', '#10B981', '#34D399'];

export default function DrawingAnalyticsDashboard() {
  const { activeProjectId } = useActiveProject();
  const [selectedDrawingSet, setSelectedDrawingSet] = useState(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState('all');
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);
  const [selectedRevisions, setSelectedRevisions] = useState({ rev1: null, rev2: null });

  // Fetch drawing data
  const { data: drawingSets = [], isLoading: setsLoading } = useQuery({
    queryKey: ['drawingSets', activeProjectId],
    queryFn: () => base44.entities.DrawingSet.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: drawingRevisions = [], isLoading: revisionsLoading } = useQuery({
    queryKey: ['drawingRevisions', activeProjectId],
    queryFn: () => base44.entities.DrawingRevision.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: drawingSheets = [] } = useQuery({
    queryKey: ['drawingSheets', activeProjectId],
    queryFn: () => base44.entities.DrawingSheet.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: annotations = [] } = useQuery({
    queryKey: ['drawingAnnotations', activeProjectId],
    queryFn: () => base44.entities.DrawingAnnotation.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  // Fetch RFI/issue data
  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', activeProjectId],
    queryFn: () => base44.entities.RFI.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: conflicts = [] } = useQuery({
    queryKey: ['drawingConflicts', activeProjectId],
    queryFn: () => base44.entities.DrawingConflict.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: erectionIssues = [] } = useQuery({
    queryKey: ['erectionIssues', activeProjectId],
    queryFn: () => base44.entities.ErectionIssue.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: designFlags = [] } = useQuery({
    queryKey: ['designIntentFlags', activeProjectId],
    queryFn: () => base44.entities.DesignIntentFlag.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  // Filter drawing sets by discipline
  const filteredDrawingSets = useMemo(() => {
    if (selectedDiscipline === 'all') return drawingSets;
    return drawingSets.filter(ds => ds.discipline === selectedDiscipline);
  }, [drawingSets, selectedDiscipline]);

  // 1. REVISION CLOUD DISTRIBUTION ANALYSIS
  const revisionCloudData = useMemo(() => {
    const revClouds = annotations.filter(a => a.annotation_type === 'revision_cloud');
    
    // Group by drawing set
    const byDrawingSet = {};
    revClouds.forEach(cloud => {
      const sheet = drawingSheets.find(s => s.id === cloud.sheet_id);
      if (!sheet) return;
      
      const setId = sheet.drawing_set_id;
      const drawingSet = drawingSets.find(ds => ds.id === setId);
      if (!drawingSet) return;

      if (!byDrawingSet[setId]) {
        byDrawingSet[setId] = {
          set_number: drawingSet.set_number,
          title: drawingSet.title,
          count: 0,
          linked_issues: 0
        };
      }
      byDrawingSet[setId].count++;

      // Check if this cloud location has linked issues
      const linkedRFIs = rfis.filter(r => 
        r.origin_drawing_id === sheet.id && 
        r.location_area?.includes(cloud.location_reference || '')
      );
      const linkedConflicts = conflicts.filter(c => 
        (c.sheet_1_id === sheet.id || c.sheet_2_id === sheet.id) &&
        c.location_reference?.includes(cloud.location_reference || '')
      );
      
      if (linkedRFIs.length > 0 || linkedConflicts.length > 0) {
        byDrawingSet[setId].linked_issues++;
      }
    });

    return Object.values(byDrawingSet).sort((a, b) => b.count - a.count);
  }, [annotations, drawingSheets, drawingSets, rfis, conflicts]);

  // Impact summary
  const revisionImpactSummary = useMemo(() => {
    const totalClouds = annotations.filter(a => a.annotation_type === 'revision_cloud').length;
    const cloudsWithIssues = revisionCloudData.reduce((sum, item) => sum + item.linked_issues, 0);
    const impactRate = totalClouds > 0 ? (cloudsWithIssues / totalClouds * 100).toFixed(1) : 0;

    return { totalClouds, cloudsWithIssues, impactRate };
  }, [annotations, revisionCloudData]);

  // 2. RFI/ISSUE LINKAGE TO DRAWING AREAS
  const issuesByDrawingArea = useMemo(() => {
    const areaMap = {};

    // Process RFIs
    rfis.forEach(rfi => {
      const sheet = drawingSheets.find(s => s.id === rfi.origin_drawing_id);
      if (!sheet) return;

      const key = `${sheet.sheet_number}-${rfi.location_area || 'General'}`;
      if (!areaMap[key]) {
        areaMap[key] = {
          sheet_number: sheet.sheet_number,
          location: rfi.location_area || 'General',
          rfis: [],
          conflicts: [],
          erection_issues: [],
          design_flags: []
        };
      }
      areaMap[key].rfis.push(rfi);
    });

    // Process conflicts
    conflicts.forEach(conflict => {
      const sheet1 = drawingSheets.find(s => s.id === conflict.sheet_1_id);
      const sheet2 = drawingSheets.find(s => s.id === conflict.sheet_2_id);
      
      [sheet1, sheet2].filter(Boolean).forEach(sheet => {
        const key = `${sheet.sheet_number}-${conflict.location_reference || 'General'}`;
        if (!areaMap[key]) {
          areaMap[key] = {
            sheet_number: sheet.sheet_number,
            location: conflict.location_reference || 'General',
            rfis: [],
            conflicts: [],
            erection_issues: [],
            design_flags: []
          };
        }
        areaMap[key].conflicts.push(conflict);
      });
    });

    // Process erection issues
    erectionIssues.forEach(issue => {
      const sheet = drawingSheets.find(s => s.id === issue.sheet_id);
      if (!sheet) return;

      const key = `${sheet.sheet_number}-${issue.location_reference || 'General'}`;
      if (!areaMap[key]) {
        areaMap[key] = {
          sheet_number: sheet.sheet_number,
          location: issue.location_reference || 'General',
          rfis: [],
          conflicts: [],
          erection_issues: [],
          design_flags: []
        };
      }
      areaMap[key].erection_issues.push(issue);
    });

    // Process design flags
    designFlags.forEach(flag => {
      const sheet = drawingSheets.find(s => s.id === flag.sheet_id);
      if (!sheet) return;

      const key = `${sheet.sheet_number}-${flag.location_reference || 'General'}`;
      if (!areaMap[key]) {
        areaMap[key] = {
          sheet_number: sheet.sheet_number,
          location: flag.location_reference || 'General',
          rfis: [],
          conflicts: [],
          erection_issues: [],
          design_flags: []
        };
      }
      areaMap[key].design_flags.push(flag);
    });

    // Calculate metrics for each area
    return Object.values(areaMap).map(area => {
      const openRFIs = area.rfis.filter(r => r.status !== 'closed' && r.status !== 'answered').length;
      const openConflicts = area.conflicts.filter(c => c.status === 'open').length;
      const openIssues = area.erection_issues.filter(i => i.status === 'open').length;
      const openFlags = area.design_flags.filter(f => f.status === 'flagged').length;

      const totalOpen = openRFIs + openConflicts + openIssues + openFlags;
      const totalResolved = (area.rfis.length - openRFIs) + 
                           (area.conflicts.length - openConflicts) + 
                           (area.erection_issues.length - openIssues) +
                           (area.design_flags.length - openFlags);

      // Calculate average age of open items
      const openItems = [
        ...area.rfis.filter(r => r.status !== 'closed' && r.status !== 'answered'),
        ...area.conflicts.filter(c => c.status === 'open'),
        ...area.erection_issues.filter(i => i.status === 'open'),
        ...area.design_flags.filter(f => f.status === 'flagged')
      ];

      let avgAge = 0;
      if (openItems.length > 0) {
        const totalDays = openItems.reduce((sum, item) => {
          const createdDate = item.submitted_date || item.detected_at || item.created_date;
          if (!createdDate) return sum;
          return sum + differenceInDays(new Date(), parseISO(createdDate));
        }, 0);
        avgAge = Math.round(totalDays / openItems.length);
      }

      return {
        ...area,
        total_items: area.rfis.length + area.conflicts.length + area.erection_issues.length + area.design_flags.length,
        open_items: totalOpen,
        resolved_items: totalResolved,
        avg_age_days: avgAge,
        has_critical: area.rfis.some(r => r.priority === 'critical') || 
                      area.conflicts.some(c => c.risk_level === 'critical') ||
                      area.erection_issues.some(i => i.install_risk === 'high')
      };
    }).sort((a, b) => b.open_items - a.open_items);
  }, [rfis, conflicts, erectionIssues, designFlags, drawingSheets]);

  // Issue resolution metrics
  const resolutionMetrics = useMemo(() => {
    const resolvedRFIs = rfis.filter(r => r.status === 'closed' || r.status === 'answered');
    const resolvedConflicts = conflicts.filter(c => c.status === 'resolved');
    
    let totalResolutionTime = 0;
    let count = 0;

    resolvedRFIs.forEach(rfi => {
      if (rfi.submitted_date && rfi.closed_date) {
        totalResolutionTime += differenceInDays(parseISO(rfi.closed_date), parseISO(rfi.submitted_date));
        count++;
      }
    });

    resolvedConflicts.forEach(conflict => {
      if (conflict.detected_at && conflict.resolved_at) {
        totalResolutionTime += differenceInDays(parseISO(conflict.resolved_at), parseISO(conflict.detected_at));
        count++;
      }
    });

    return {
      avgResolutionDays: count > 0 ? Math.round(totalResolutionTime / count) : 0,
      totalResolved: count
    };
  }, [rfis, conflicts]);

  // 3. SIDE-BY-SIDE COMPARISON DATA
  const revisionsForComparison = useMemo(() => {
    if (!selectedDrawingSet) return [];
    return drawingRevisions
      .filter(rev => rev.drawing_set_id === selectedDrawingSet)
      .sort((a, b) => new Date(b.revision_date) - new Date(a.revision_date));
  }, [drawingRevisions, selectedDrawingSet]);

  const handleCompareRevisions = () => {
    if (selectedRevisions.rev1 && selectedRevisions.rev2) {
      setComparisonDialogOpen(true);
    }
  };

  if (setsLoading || revisionsLoading) return <LoadingState />;

  return (
    <PageShell>
      <PageHeader 
        title="Drawing Analytics Dashboard"
        subtitle="Revision tracking, issue linkage, and version comparison"
        icon={FileText}
      />

      {/* Summary KPIs */}
      <ContentSection>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target size={16} className="text-[#FF9D42]" />
                Revision Clouds
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{revisionImpactSummary.totalClouds}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {revisionImpactSummary.cloudsWithIssues} linked to issues ({revisionImpactSummary.impactRate}%)
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Open Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {issuesByDrawingArea.reduce((sum, area) => sum + area.open_items, 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Across {issuesByDrawingArea.length} drawing areas
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock size={16} className="text-blue-500" />
                Avg Resolution Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{resolutionMetrics.avgResolutionDays} days</div>
              <div className="text-xs text-muted-foreground mt-1">
                {resolutionMetrics.totalResolved} items resolved
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText size={16} className="text-green-500" />
                Drawing Sets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{drawingSets.length}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {drawingRevisions.length} total revisions
              </div>
            </CardContent>
          </Card>
        </div>
      </ContentSection>

      {/* Main Content Tabs */}
      <ContentSection>
        <Tabs defaultValue="revision-clouds" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="revision-clouds">Revision Cloud Distribution</TabsTrigger>
            <TabsTrigger value="issue-linkage">Issue Linkage by Area</TabsTrigger>
            <TabsTrigger value="comparison">Version Comparison</TabsTrigger>
          </TabsList>

          {/* Tab 1: Revision Cloud Distribution */}
          <TabsContent value="revision-clouds" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Revision Cloud Distribution & Impact</CardTitle>
                <CardDescription>
                  Shows revision clouds per drawing set and their linkage to RFIs/conflicts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {revisionCloudData.length > 0 ? (
                  <div className="space-y-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={revisionCloudData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="set_number" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0A0A0A', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px'
                          }} 
                        />
                        <Legend />
                        <Bar dataKey="count" fill="#FF9D42" name="Total Revision Clouds" />
                        <Bar dataKey="linked_issues" fill="#EF4444" name="Linked to Issues" />
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="space-y-2">
                      {revisionCloudData.slice(0, 10).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]">
                          <div className="flex-1">
                            <div className="font-medium text-white">{item.set_number}</div>
                            <div className="text-sm text-muted-foreground">{item.title}</div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-[#FF9D42]">{item.count}</div>
                              <div className="text-xs text-muted-foreground">Clouds</div>
                            </div>
                            {item.linked_issues > 0 && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle size={12} />
                                {item.linked_issues} Issues
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No revision clouds detected. Run drawing analysis to identify revision marks.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Issue Linkage by Drawing Area */}
          <TabsContent value="issue-linkage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>RFI/Issue Linkage by Drawing Area</CardTitle>
                <CardDescription>
                  Resolution status, aging, and concentration of issues per drawing location
                </CardDescription>
              </CardHeader>
              <CardContent>
                {issuesByDrawingArea.length > 0 ? (
                  <div className="space-y-3">
                    {issuesByDrawingArea.map((area, idx) => (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-lg border transition-all ${
                          area.has_critical 
                            ? 'bg-red-500/10 border-red-500/30' 
                            : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.05)]'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <MapPin size={16} className="text-[#FF9D42]" />
                              <span className="font-semibold text-white">{area.sheet_number}</span>
                              <span className="text-muted-foreground">—</span>
                              <span className="text-sm text-muted-foreground">{area.location}</span>
                              {area.has_critical && (
                                <Badge variant="destructive" className="ml-2">Critical</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {area.total_items} total items • {area.open_items} open • {area.resolved_items} resolved
                            </div>
                          </div>
                          {area.avg_age_days > 0 && (
                            <div className="text-right">
                              <div className="text-2xl font-bold text-amber-500">{area.avg_age_days}</div>
                              <div className="text-xs text-muted-foreground">Avg Age (days)</div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-4 gap-3 mt-3">
                          {area.rfis.length > 0 && (
                            <div className="text-center p-2 rounded bg-[rgba(255,255,255,0.05)]">
                              <div className="text-lg font-bold text-blue-400">{area.rfis.length}</div>
                              <div className="text-xs text-muted-foreground">RFIs</div>
                            </div>
                          )}
                          {area.conflicts.length > 0 && (
                            <div className="text-center p-2 rounded bg-[rgba(255,255,255,0.05)]">
                              <div className="text-lg font-bold text-amber-400">{area.conflicts.length}</div>
                              <div className="text-xs text-muted-foreground">Conflicts</div>
                            </div>
                          )}
                          {area.erection_issues.length > 0 && (
                            <div className="text-center p-2 rounded bg-[rgba(255,255,255,0.05)]">
                              <div className="text-lg font-bold text-red-400">{area.erection_issues.length}</div>
                              <div className="text-xs text-muted-foreground">Erection Issues</div>
                            </div>
                          )}
                          {area.design_flags.length > 0 && (
                            <div className="text-center p-2 rounded bg-[rgba(255,255,255,0.05)]">
                              <div className="text-lg font-bold text-purple-400">{area.design_flags.length}</div>
                              <div className="text-xs text-muted-foreground">Design Flags</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No issues linked to drawing areas yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Side-by-Side Comparison */}
          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Drawing Version Comparison</CardTitle>
                <CardDescription>
                  Select two revisions to compare side-by-side with highlighted differences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select onValueChange={setSelectedDrawingSet}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Drawing Set" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredDrawingSets.map(ds => (
                          <SelectItem key={ds.id} value={ds.id}>
                            {ds.set_number} - {ds.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select 
                      disabled={!selectedDrawingSet}
                      onValueChange={(val) => setSelectedRevisions(prev => ({ ...prev, rev1: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Revision 1" />
                      </SelectTrigger>
                      <SelectContent>
                        {revisionsForComparison.map(rev => (
                          <SelectItem key={rev.id} value={rev.id}>
                            {rev.revision_number} ({format(parseISO(rev.revision_date), 'MM/dd/yyyy')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select 
                      disabled={!selectedDrawingSet || !selectedRevisions.rev1}
                      onValueChange={(val) => setSelectedRevisions(prev => ({ ...prev, rev2: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Revision 2" />
                      </SelectTrigger>
                      <SelectContent>
                        {revisionsForComparison
                          .filter(rev => rev.id !== selectedRevisions.rev1)
                          .map(rev => (
                            <SelectItem key={rev.id} value={rev.id}>
                              {rev.revision_number} ({format(parseISO(rev.revision_date), 'MM/dd/yyyy')})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleCompareRevisions}
                    disabled={!selectedRevisions.rev1 || !selectedRevisions.rev2}
                    className="w-full gap-2"
                  >
                    <GitCompare size={16} />
                    Compare Revisions
                  </Button>

                  {/* Recent Comparisons */}
                  {selectedDrawingSet && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-white mb-3">Recent Revisions</h3>
                      <div className="space-y-2">
                        {revisionsForComparison.slice(0, 5).map((rev) => {
                          const relatedConflicts = conflicts.filter(c => {
                            const sheet1 = drawingSheets.find(s => s.id === c.sheet_1_id);
                            const sheet2 = drawingSheets.find(s => s.id === c.sheet_2_id);
                            return sheet1?.drawing_set_id === selectedDrawingSet || 
                                   sheet2?.drawing_set_id === selectedDrawingSet;
                          });

                          return (
                            <div 
                              key={rev.id} 
                              className="p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] flex items-center justify-between"
                            >
                              <div>
                                <div className="font-medium text-white">{rev.revision_number}</div>
                                <div className="text-sm text-muted-foreground">
                                  {format(parseISO(rev.revision_date), 'MMM dd, yyyy')} • {rev.description || 'No description'}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant={rev.is_current ? 'default' : 'secondary'}>
                                  {rev.is_current ? 'Current' : rev.status}
                                </Badge>
                                {relatedConflicts.length > 0 && (
                                  <Badge variant="destructive">
                                    {relatedConflicts.length} Conflicts
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </ContentSection>

      {/* Comparison Dialog */}
      <Dialog open={comparisonDialogOpen} onOpenChange={setComparisonDialogOpen}>
        <DialogContent className="max-w-7xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Drawing Revision Comparison</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 h-full overflow-auto">
            {selectedRevisions.rev1 && selectedRevisions.rev2 && (() => {
              const rev1 = drawingRevisions.find(r => r.id === selectedRevisions.rev1);
              const rev2 = drawingRevisions.find(r => r.id === selectedRevisions.rev2);

              // Find conflicts between these revisions
              const relatedConflicts = conflicts.filter(c => {
                const sheet1 = drawingSheets.find(s => s.id === c.sheet_1_id);
                const sheet2 = drawingSheets.find(s => s.id === c.sheet_2_id);
                return (sheet1?.drawing_set_id === selectedDrawingSet || 
                        sheet2?.drawing_set_id === selectedDrawingSet) &&
                       c.status === 'open';
              });

              return (
                <>
                  <div className="space-y-3">
                    <div className="bg-[rgba(255,255,255,0.05)] p-3 rounded-lg">
                      <div className="font-semibold text-white">{rev1?.revision_number}</div>
                      <div className="text-sm text-muted-foreground">
                        {rev1 && format(parseISO(rev1.revision_date), 'MMM dd, yyyy')}
                      </div>
                    </div>
                    {rev1?.sheets?.[0]?.file_url ? (
                      <img 
                        src={rev1.sheets[0].file_url} 
                        alt={`Revision ${rev1.revision_number}`}
                        className="w-full rounded-lg border border-[rgba(255,255,255,0.1)]"
                      />
                    ) : (
                      <div className="h-96 flex items-center justify-center bg-[rgba(255,255,255,0.03)] rounded-lg">
                        <span className="text-muted-foreground">No drawing file available</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="bg-[rgba(255,255,255,0.05)] p-3 rounded-lg">
                      <div className="font-semibold text-white">{rev2?.revision_number}</div>
                      <div className="text-sm text-muted-foreground">
                        {rev2 && format(parseISO(rev2.revision_date), 'MMM dd, yyyy')}
                      </div>
                    </div>
                    {rev2?.sheets?.[0]?.file_url ? (
                      <img 
                        src={rev2.sheets[0].file_url} 
                        alt={`Revision ${rev2.revision_number}`}
                        className="w-full rounded-lg border border-[rgba(255,255,255,0.1)]"
                      />
                    ) : (
                      <div className="h-96 flex items-center justify-center bg-[rgba(255,255,255,0.03)] rounded-lg">
                        <span className="text-muted-foreground">No drawing file available</span>
                      </div>
                    )}
                  </div>

                  {relatedConflicts.length > 0 && (
                    <div className="col-span-2 mt-4">
                      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-500" />
                        Detected Differences ({relatedConflicts.length})
                      </h3>
                      <div className="space-y-2 max-h-48 overflow-auto">
                        {relatedConflicts.map((conflict, idx) => (
                          <div 
                            key={idx} 
                            className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
                          >
                            <div className="font-medium text-white text-sm">{conflict.conflict_type}</div>
                            <div className="text-xs text-muted-foreground mt-1">{conflict.description}</div>
                            <div className="text-xs text-amber-500 mt-1">
                              Location: {conflict.location_reference || 'General'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}