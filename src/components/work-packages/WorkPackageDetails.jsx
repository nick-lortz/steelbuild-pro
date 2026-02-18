import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from "@/components/ui/StatusBadge";
import { Pencil, ArrowRight, FileText, Link as LinkIcon, CheckCircle2, Package as PackageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import BudgetManager from '@/components/budget/BudgetManager';
import TaskAssignment from '@/components/work-packages/TaskAssignment';

export default function WorkPackageDetails({
  package: pkg,
  projectId,
  tasks = [],
  sovItems = [],
  costCodes = [],
  documents = [],
  drawings = [],
  deliveries = [],
  onEdit,
  onAdvancePhase,
  onUpdate
}) {
  const { data: laborHours = [] } = useQuery({
    queryKey: ['labor-hours', projectId],
    queryFn: () => base44.entities.LaborHours.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: equipmentUsage = [] } = useQuery({
    queryKey: ['equipment-usage', projectId],
    queryFn: () => base44.entities.EquipmentUsage.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', projectId],
    queryFn: () => base44.entities.Expense.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000
  });

  const linkedSOVItems = sovItems.filter(sov => pkg.sov_item_ids?.includes(sov.id));
  const linkedCostCodes = costCodes.filter(cc => pkg.cost_code_ids?.includes(cc.id));
  const linkedDrawingSets = drawings.filter(dwg => pkg.linked_drawing_set_ids?.includes(dwg.id));
  const linkedDocs = documents.filter(doc => pkg.linked_document_ids?.includes(doc.id));
  const linkedDeliveries = deliveries.filter(d => pkg.linked_delivery_ids?.includes(d.id));

  const phaseMap = {
    'detailing': { next: 'fabrication', label: 'Advance to Fabrication' },
    'fabrication': { next: 'delivery', label: 'Advance to Delivery' },
    'delivery': { next: 'erection', label: 'Advance to Erection' },
    'erection': { next: 'complete', label: 'Mark Complete' }
  };
  const currentPhase = phaseMap[pkg.phase];

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const taskProgress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  return (
    <div className="space-y-6 mt-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-zinc-500">Package</div>
          <div className="text-2xl font-bold text-white">{pkg.package_number || pkg.id.slice(0, 8)}</div>
          <div className="text-lg text-zinc-200 mt-1">{pkg.name}</div>
        </div>
        <Button onClick={onEdit} size="sm" variant="outline" className="border-zinc-700">
          <Pencil size={16} className="mr-2" />
          Edit
        </Button>
      </div>

      {/* Status Bar */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-xs text-zinc-500">Phase</div>
                <StatusBadge status={pkg.phase} />
              </div>
              <div>
                <div className="text-xs text-zinc-500">Status</div>
                <StatusBadge status={pkg.status} />
              </div>
              <div>
                <div className="text-xs text-zinc-500">Priority</div>
                <StatusBadge status={pkg.priority} />
              </div>
            </div>
            {currentPhase && pkg.status !== 'complete' && (
              <Button
                onClick={() => onAdvancePhase(pkg, currentPhase.next)}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                {currentPhase.label}
                <ArrowRight size={16} className="ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-sm">Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-400">Overall</span>
              <span className="text-white font-semibold">{pkg.percent_complete || 0}%</span>
            </div>
            <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${pkg.percent_complete || 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-400">Tasks ({completedTasks}/{tasks.length})</span>
              <span className="text-white font-semibold">{taskProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${taskProgress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-sm">Quantities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Tonnage</span>
              <span className="text-white font-semibold">{pkg.tonnage || 0} tons</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Pieces</span>
              <span className="text-white font-semibold">{pkg.piece_count || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-sm">Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Start</span>
              <span className="text-white">{pkg.start_date ? format(new Date(pkg.start_date), 'MMM d, yyyy') : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Target</span>
              <span className="text-white">{pkg.target_date ? format(new Date(pkg.target_date), 'MMM d, yyyy') : '-'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-sm">Estimated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Hours</span>
              <span className="text-white font-semibold">{pkg.estimated_hours || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Cost</span>
              <span className="text-white font-semibold">${(pkg.estimated_cost || 0).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-sm">Actual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Hours</span>
              <span className="text-white font-semibold">{pkg.actual_hours || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Cost</span>
              <span className="text-white font-semibold">${(pkg.actual_cost || 0).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SOV Items */}
      {linkedSOVItems.length > 0 && (
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText size={16} />
              SOV Line Items ({linkedSOVItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {linkedSOVItems.map(sov => (
                <div key={sov.id} className="flex items-center justify-between p-2 bg-zinc-900/50 rounded">
                  <div>
                    <div className="font-mono text-xs text-amber-500">{sov.sov_code}</div>
                    <div className="text-sm text-zinc-200">{sov.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white font-semibold">${(sov.scheduled_value || 0).toLocaleString()}</div>
                    <div className="text-xs text-zinc-500">{sov.percent_complete || 0}% complete</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Codes */}
      {linkedCostCodes.length > 0 && (
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <LinkIcon size={16} />
              Cost Codes ({linkedCostCodes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {linkedCostCodes.map(cc => (
                <Badge key={cc.id} variant="outline" className="bg-zinc-900/50 border-zinc-700">
                  {cc.code} - {cc.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drawing Sets */}
      {linkedDrawingSets.length > 0 && (
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText size={16} />
              Drawing Sets ({linkedDrawingSets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {linkedDrawingSets.map(dwg => (
                <div key={dwg.id} className="flex items-center justify-between p-2 bg-zinc-900/50 rounded">
                  <div>
                    <div className="font-mono text-xs text-blue-500">{dwg.set_number}</div>
                    <div className="text-sm text-zinc-200">{dwg.title}</div>
                  </div>
                  <StatusBadge status={dwg.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabbed Content */}
      <Tabs defaultValue="details" className="mt-4">
        <TabsList className="bg-zinc-800 border border-zinc-700">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-4">
          <TaskAssignment
            workPackage={pkg}
            tasks={tasks}
            projectId={projectId}
          />

          {/* Description & Notes */}
          {(pkg.scope_summary || pkg.notes) && (
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-sm">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pkg.scope_summary && (
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Scope Summary</div>
                    <div className="text-sm text-zinc-200">{pkg.scope_summary}</div>
                  </div>
                )}
                {pkg.notes && (
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Notes</div>
                    <div className="text-sm text-zinc-200 whitespace-pre-wrap">{pkg.notes}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {pkg.assigned_pm && (
            <div className="text-sm">
              <span className="text-zinc-500">Assigned PM: </span>
              <span className="text-zinc-200">{pkg.assigned_pm}</span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="budget" className="space-y-4 mt-4">
          <BudgetManager
            workPackage={pkg}
            tasks={tasks}
            laborHours={laborHours}
            equipmentUsage={equipmentUsage}
            expenses={expenses}
            costCodes={costCodes}
            onUpdateBudget={(data) => onUpdate(data)}
          />
        </TabsContent>

        <TabsContent value="links" className="space-y-4 mt-4">
          {/* SOV Items */}
          {linkedSOVItems.length > 0 && (
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText size={16} />
                  SOV Line Items ({linkedSOVItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {linkedSOVItems.map(sov => (
                    <div key={sov.id} className="flex items-center justify-between p-2 bg-zinc-900/50 rounded">
                      <div>
                        <div className="font-mono text-xs text-amber-500">{sov.sov_code}</div>
                        <div className="text-sm text-zinc-200">{sov.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-white font-semibold">${(sov.scheduled_value || 0).toLocaleString()}</div>
                        <div className="text-xs text-zinc-500">{sov.percent_complete || 0}% complete</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cost Codes */}
          {linkedCostCodes.length > 0 && (
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <LinkIcon size={16} />
                  Cost Codes ({linkedCostCodes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {linkedCostCodes.map(cc => (
                    <Badge key={cc.id} variant="outline" className="bg-zinc-900/50 border-zinc-700">
                      {cc.code} - {cc.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Drawing Sets */}
          {linkedDrawingSets.length > 0 && (
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText size={16} />
                  Drawing Sets ({linkedDrawingSets.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {linkedDrawingSets.map(dwg => (
                    <div key={dwg.id} className="flex items-center justify-between p-2 bg-zinc-900/50 rounded">
                      <div>
                        <div className="font-mono text-xs text-blue-500">{dwg.set_number}</div>
                        <div className="text-sm text-zinc-200">{dwg.title}</div>
                      </div>
                      <StatusBadge status={dwg.status} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deliveries */}
          {linkedDeliveries.length > 0 && (
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <PackageIcon size={16} />
                  Linked Deliveries ({linkedDeliveries.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {linkedDeliveries.map(delivery => (
                    <div key={delivery.id} className="flex items-center justify-between p-2 bg-zinc-900/50 rounded">
                      <div>
                        <div className="text-sm text-zinc-200">{delivery.package_name}</div>
                        <div className="text-xs text-zinc-500">{delivery.delivery_number}</div>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={delivery.delivery_status} />
                        {delivery.scheduled_date && (
                          <div className="text-xs text-zinc-400 mt-1">
                            {format(new Date(delivery.scheduled_date), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}