import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ZoomIn, ZoomOut, Maximize2, AlertTriangle, Target, PlayCircle, RotateCcw } from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';

export default function DependencyGraph({ tasks, onTaskClick }) {
  const [zoom, setZoom] = useState(1);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [simulatedTasks, setSimulatedTasks] = useState(tasks);
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulationTask, setSimulationTask] = useState(null);
  const [delayDays, setDelayDays] = useState(0);
  const [simulationActive, setSimulationActive] = useState(false);

  const { nodes, edges, criticalPath, pathStats, bottlenecks } = useMemo(() => {
    return calculateCriticalPath(simulationActive ? simulatedTasks : tasks);
  }, [tasks, simulatedTasks, simulationActive]);

  const handleTaskClick = (task) => {
    setSelectedTaskId(task.id);
    if (onTaskClick) onTaskClick(task);
  };

  const handleSimulateDelay = () => {
    if (!simulationTask || delayDays === 0) return;

    const updatedTasks = tasks.map(t => {
      if (t.id === simulationTask.id) {
        const newEndDate = addDays(new Date(t.end_date), delayDays);
        return {
          ...t,
          end_date: format(newEndDate, 'yyyy-MM-dd'),
          duration_days: (t.duration_days || 0) + delayDays,
          _simulated: true,
          _originalEndDate: t.end_date
        };
      }
      return t;
    });

    setSimulatedTasks(updatedTasks);
    setSimulationActive(true);
    setShowSimulation(false);
  };

  const resetSimulation = () => {
    setSimulatedTasks(tasks);
    setSimulationActive(false);
    setSimulationTask(null);
    setDelayDays(0);
  };

  // Layout tasks in columns by their early start
  const layout = useMemo(() => {
    const columns = {};
    const columnWidth = 250;
    const nodeHeight = 80;
    const verticalSpacing = 30;

    nodes.forEach(node => {
      const col = Math.floor(node.earlyStart / 7); // Group by week
      if (!columns[col]) columns[col] = [];
      columns[col].push(node);
    });

    const positioned = nodes.map(node => {
      const col = Math.floor(node.earlyStart / 7);
      const colNodes = columns[col];
      const index = colNodes.indexOf(node);
      
      return {
        ...node,
        x: col * columnWidth + 50,
        y: index * (nodeHeight + verticalSpacing) + 50
      };
    });

    return positioned;
  }, [nodes]);

  const svgWidth = Math.max(...layout.map(n => n.x)) + 300;
  const svgHeight = Math.max(...layout.map(n => n.y)) + 150;

  return (
    <div className="space-y-4">
      {/* Simulation Alert */}
      {simulationActive && (
        <Card className="bg-amber-500/10 border-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-amber-500" />
                <div>
                  <div className="font-bold text-amber-400">SIMULATION ACTIVE</div>
                  <div className="text-xs text-zinc-400">
                    Showing projected impact of {delayDays}d delay on: {simulationTask?.name}
                  </div>
                </div>
              </div>
              <Button 
                onClick={resetSimulation} 
                variant="outline" 
                size="sm"
                className="border-amber-500 text-amber-400 hover:bg-amber-500/20"
              >
                <RotateCcw size={14} className="mr-2" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Header */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="grid grid-cols-5 gap-4">
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Critical Path Duration</div>
              <div className={`text-2xl font-bold ${simulationActive ? 'text-amber-400' : 'text-red-400'}`}>
                {pathStats.criticalPathDuration} days
                {simulationActive && pathStats.originalDuration && (
                  <span className="text-sm ml-2 text-zinc-500">
                    (+{pathStats.criticalPathDuration - pathStats.originalDuration})
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Critical Tasks</div>
              <div className="text-2xl font-bold text-amber-400">{criticalPath.length}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Bottlenecks</div>
              <div className="text-2xl font-bold text-red-400">{bottlenecks.length}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Total Tasks</div>
              <div className="text-2xl font-bold">{tasks.length}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Project Finish</div>
              <div className={`text-lg font-bold ${simulationActive ? 'text-amber-400' : 'text-white'}`}>
                {pathStats.projectEnd ? format(new Date(pathStats.projectEnd), 'MMM d, yyyy') : 'N/A'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="border-zinc-700"
          >
            <ZoomOut size={14} />
          </Button>
          <span className="text-sm text-zinc-400">{Math.round(zoom * 100)}%</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            className="border-zinc-700"
          >
            <ZoomIn size={14} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(1)}
            className="border-zinc-700"
          >
            <Maximize2 size={14} className="mr-2" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={() => setShowSimulation(true)}
            className="bg-amber-500 hover:bg-amber-600 text-black ml-4"
          >
            <PlayCircle size={14} className="mr-2" />
            Simulate Delay
          </Button>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500/20 border-2 border-red-500 rounded" />
            <span className="text-zinc-400">Critical Path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500/20 border-2 border-purple-500 rounded" />
            <span className="text-zinc-400">Bottleneck</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-zinc-800 border-2 border-zinc-600 rounded" />
            <span className="text-zinc-400">Normal Task</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-500/20 border-2 border-amber-500 rounded-full" />
            <span className="text-zinc-400">Milestone</span>
          </div>
        </div>
      </div>

      {/* Graph */}
      <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-auto" style={{ maxHeight: '600px' }}>
            <svg
              width={svgWidth * zoom}
              height={svgHeight * zoom}
              className="bg-zinc-950"
            >
              <g transform={`scale(${zoom})`}>
                {/* Draw edges first */}
                {edges.map((edge, idx) => {
                  const fromNode = layout.find(n => n.id === edge.from);
                  const toNode = layout.find(n => n.id === edge.to);
                  if (!fromNode || !toNode) return null;

                  const isCritical = criticalPath.includes(edge.from) && criticalPath.includes(edge.to);
                  
                  // Calculate connection points
                  const x1 = fromNode.x + 200;
                  const y1 = fromNode.y + 35;
                  const x2 = toNode.x;
                  const y2 = toNode.y + 35;

                  // Bezier curve for smoother connections
                  const midX = (x1 + x2) / 2;

                  return (
                    <g key={idx}>
                      <path
                        d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                        stroke={isCritical ? '#ef4444' : '#52525b'}
                        strokeWidth={isCritical ? 3 : 2}
                        fill="none"
                        opacity={isCritical ? 1 : 0.4}
                        strokeDasharray={edge.type !== 'FS' ? '5,5' : '0'}
                      />
                      {/* Arrow */}
                      <polygon
                        points={`${x2},${y2} ${x2-8},${y2-4} ${x2-8},${y2+4}`}
                        fill={isCritical ? '#ef4444' : '#52525b'}
                        opacity={isCritical ? 1 : 0.4}
                      />
                      {/* Label for non-FS dependencies */}
                      {edge.type !== 'FS' && (
                        <text
                          x={midX}
                          y={(y1 + y2) / 2 - 5}
                          fontSize="10"
                          fill="#71717a"
                          textAnchor="middle"
                        >
                          {edge.type}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Draw nodes */}
                {layout.map(node => {
                  const isCritical = criticalPath.includes(node.id);
                  const isBottleneck = bottlenecks.some(b => b.taskId === node.id);
                  const isSelected = selectedTaskId === node.id;
                  const isMilestone = node.is_milestone;
                  const isSimulated = node.task._simulated;

                  return (
                    <g key={node.id}>
                      {/* Bottleneck pulse animation */}
                      {isBottleneck && (
                        <rect
                          x={node.x - 4}
                          y={node.y - 4}
                          width="208"
                          height="78"
                          rx={isMilestone ? 39 : 10}
                          fill="none"
                          stroke="#a855f7"
                          strokeWidth="2"
                          opacity="0.6"
                        >
                          <animate
                            attributeName="stroke-width"
                            values="2;4;2"
                            dur="2s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            values="0.6;1;0.6"
                            dur="2s"
                            repeatCount="indefinite"
                          />
                        </rect>
                      )}

                      {/* Node background */}
                      <rect
                        x={node.x}
                        y={node.y}
                        width="200"
                        height="70"
                        rx={isMilestone ? 35 : 6}
                        fill={
                          isSimulated ? '#78350f' :
                          isBottleneck ? '#581c87' :
                          isCritical ? '#7f1d1d' : '#18181b'
                        }
                        stroke={
                          isSimulated ? '#f59e0b' :
                          isBottleneck ? '#a855f7' :
                          isCritical ? '#ef4444' : 
                          isSelected ? '#f59e0b' : '#3f3f46'
                        }
                        strokeWidth={isCritical || isSelected || isBottleneck || isSimulated ? 3 : 2}
                        className="cursor-pointer"
                        onClick={() => handleTaskClick(node.task)}
                      />

                      {/* Task name */}
                      <text
                        x={node.x + 10}
                        y={node.y + 20}
                        fontSize="13"
                        fontWeight="600"
                        fill={isCritical ? '#fca5a5' : '#ffffff'}
                        className="cursor-pointer"
                        onClick={() => handleTaskClick(node.task)}
                      >
                        {truncate(node.task.name, 22)}
                      </text>

                      {/* Duration */}
                      <text
                        x={node.x + 10}
                        y={node.y + 40}
                        fontSize="11"
                        fill="#71717a"
                      >
                        {node.duration}d
                      </text>

                      {/* Float */}
                      {!isCritical && node.float > 0 && (
                        <text
                          x={node.x + 50}
                          y={node.y + 40}
                          fontSize="11"
                          fill="#3b82f6"
                        >
                          Float: {node.float}d
                        </text>
                      )}

                      {/* Status badge */}
                      <rect
                        x={node.x + 10}
                        y={node.y + 50}
                        width="60"
                        height="16"
                        rx="8"
                        fill={getStatusColor(node.task.status)}
                        opacity="0.3"
                      />
                      <text
                        x={node.x + 40}
                        y={node.y + 61}
                        fontSize="9"
                        fontWeight="600"
                        fill={getStatusColor(node.task.status)}
                        textAnchor="middle"
                      >
                        {node.task.status.toUpperCase()}
                      </text>

                      {/* Critical path indicator */}
                      {isCritical && (
                        <text
                          x={node.x + 180}
                          y={node.y + 20}
                          fontSize="16"
                          fill="#ef4444"
                        >
                          ⚡
                        </text>
                      )}

                      {/* Bottleneck indicator */}
                      {isBottleneck && (
                        <text
                          x={node.x + 180}
                          y={node.y + 40}
                          fontSize="16"
                          fill="#a855f7"
                        >
                          ⚠️
                        </text>
                      )}

                      {/* Simulation indicator */}
                      {isSimulated && (
                        <text
                          x={node.x + 180}
                          y={node.y + 60}
                          fontSize="16"
                          fill="#f59e0b"
                        >
                          🔮
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Critical Path Tasks List */}
      {criticalPath.length > 0 && (
        <Card className="bg-red-950/20 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-red-400">
              <AlertTriangle size={14} />
              Critical Path Tasks ({criticalPath.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalPath.map(taskId => {
                const node = nodes.find(n => n.id === taskId);
                if (!node) return null;
                return (
                  <div
                    key={taskId}
                    className="flex items-center justify-between p-2 bg-zinc-900/50 rounded hover:bg-zinc-800 cursor-pointer transition-colors"
                    onClick={() => handleTaskClick(node.task)}
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white flex items-center gap-2">
                        {node.task.name}
                        {node.task._simulated && <span className="text-amber-400">🔮</span>}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {format(new Date(node.task.start_date), 'MMM d')} - {format(new Date(node.task.end_date), 'MMM d')} • {node.duration} days
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSimulationTask(node.task);
                          setShowSimulation(true);
                        }}
                        className="text-amber-400 hover:text-amber-300"
                      >
                        <Target size={14} />
                      </Button>
                      <Badge className={`${getStatusColor(node.task.status)} text-white`}>
                        {node.task.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottleneck Alerts */}
      {bottlenecks.length > 0 && (
        <Card className="bg-purple-950/20 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-purple-400">
              <Target size={14} />
              Bottlenecks Detected ({bottlenecks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bottlenecks.map(bottleneck => {
                const node = nodes.find(n => n.id === bottleneck.taskId);
                if (!node) return null;
                return (
                  <div
                    key={bottleneck.taskId}
                    className="p-3 bg-zinc-900/50 rounded border-l-4 border-purple-500"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{node.task.name}</div>
                        <div className="text-xs text-zinc-400 mt-1">{bottleneck.reason}</div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px]">
                            {bottleneck.successorCount} dependent tasks
                          </Badge>
                          <Badge variant="outline" className="text-[10px] text-red-400">
                            Risk: {bottleneck.riskLevel}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSimulationTask(node.task);
                          setShowSimulation(true);
                        }}
                        className="text-purple-400 hover:text-purple-300"
                      >
                        <Target size={14} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delay Simulation Dialog */}
      <Dialog open={showSimulation} onOpenChange={setShowSimulation}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Simulate Task Delay Impact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Task</Label>
              <Select
                value={simulationTask?.id || ''}
                onValueChange={(id) => {
                  const task = tasks.find(t => t.id === id);
                  setSimulationTask(task);
                }}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Choose a task..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {tasks.filter(t => !t._isDelivery && !t._isFabrication).map(task => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {simulationTask && (
              <>
                <div className="p-3 bg-zinc-800 rounded border border-zinc-700">
                  <div className="text-xs text-zinc-400 mb-1">Current Schedule</div>
                  <div className="text-sm">
                    {format(new Date(simulationTask.start_date), 'MMM d')} - {format(new Date(simulationTask.end_date), 'MMM d')}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Duration: {differenceInDays(new Date(simulationTask.end_date), new Date(simulationTask.start_date))} days
                  </div>
                </div>

                <div>
                  <Label>Delay (Days)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="90"
                    value={delayDays}
                    onChange={(e) => setDelayDays(parseInt(e.target.value) || 0)}
                    className="bg-zinc-800 border-zinc-700"
                    placeholder="Enter delay in days..."
                  />
                </div>

                {delayDays > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded">
                    <div className="text-xs text-amber-400 mb-1">Projected Impact</div>
                    <div className="text-sm text-white">
                      New End Date: {format(addDays(new Date(simulationTask.end_date), delayDays), 'MMM d, yyyy')}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">
                      This will automatically recalculate all dependent tasks and update the critical path.
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSimulation(false);
                      setSimulationTask(null);
                      setDelayDays(0);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSimulateDelay}
                    disabled={delayDays === 0}
                    className="bg-amber-500 hover:bg-amber-600 text-black"
                  >
                    <PlayCircle size={14} className="mr-2" />
                    Run Simulation
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function calculateCriticalPath(tasks) {
  if (!tasks || tasks.length === 0) {
    return { nodes: [], edges: [], criticalPath: [], pathStats: {}, bottlenecks: [] };
  }

  // Filter out delivery/fab items for dependency analysis
  const validTasks = tasks.filter(t => !t._isDelivery && !t._isFabrication);

  // Build nodes with early/late start/finish
  const nodes = validTasks.map(task => {
    const duration = task.duration_days || differenceInDays(
      new Date(task.end_date),
      new Date(task.start_date)
    ) || 1;

    return {
      id: task.id,
      task,
      duration,
      predecessors: task.predecessor_configs || [],
      earlyStart: 0,
      earlyFinish: 0,
      lateStart: 0,
      lateFinish: 0,
      float: 0,
      is_milestone: task.is_milestone
    };
  });

  // Create edges
  const edges = [];
  nodes.forEach(node => {
    (node.predecessors || []).forEach(pred => {
      edges.push({
        from: pred.predecessor_id,
        to: node.id,
        type: pred.type || 'FS',
        lag: pred.lag_days || 0
      });
    });
  });

  // Forward pass - calculate early start/finish
  const calculateEarlyDates = () => {
    const visited = new Set();
    const visit = (nodeId) => {
      if (visited.has(nodeId)) return;
      
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      visited.add(nodeId);

      // Process predecessors first
      node.predecessors.forEach(pred => {
        visit(pred.predecessor_id);
      });

      // Calculate early start
      if (node.predecessors.length === 0) {
        node.earlyStart = 0;
      } else {
        node.earlyStart = Math.max(
          ...node.predecessors.map(pred => {
            const predNode = nodes.find(n => n.id === pred.predecessor_id);
            if (!predNode) return 0;

            const lag = pred.lag_days || 0;
            switch (pred.type) {
              case 'FS': return predNode.earlyFinish + lag;
              case 'SS': return predNode.earlyStart + lag;
              case 'FF': return predNode.earlyFinish - node.duration + lag;
              case 'SF': return predNode.earlyStart - node.duration + lag;
              default: return predNode.earlyFinish + lag;
            }
          })
        );
      }

      node.earlyFinish = node.earlyStart + node.duration;
    };

    nodes.forEach(node => visit(node.id));
  };

  // Backward pass - calculate late start/finish
  const calculateLateDates = () => {
    const maxEarlyFinish = Math.max(...nodes.map(n => n.earlyFinish));
    
    // Initialize late dates
    nodes.forEach(node => {
      const successors = nodes.filter(n => 
        n.predecessors.some(p => p.predecessor_id === node.id)
      );
      
      if (successors.length === 0) {
        node.lateFinish = maxEarlyFinish;
      }
    });

    // Backward pass
    const visited = new Set();
    const visit = (nodeId) => {
      if (visited.has(nodeId)) return;
      
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      visited.add(nodeId);

      const successors = nodes.filter(n => 
        n.predecessors.some(p => p.predecessor_id === nodeId)
      );

      // Process successors first
      successors.forEach(succ => visit(succ.id));

      // Calculate late finish
      if (successors.length > 0) {
        node.lateFinish = Math.min(
          ...successors.map(succ => {
            const edge = succ.predecessors.find(p => p.predecessor_id === node.id);
            const lag = edge?.lag_days || 0;
            
            switch (edge?.type) {
              case 'FS': return succ.lateStart - lag;
              case 'SS': return succ.lateStart - lag + node.duration;
              case 'FF': return succ.lateFinish - lag;
              case 'SF': return succ.lateFinish - lag + node.duration;
              default: return succ.lateStart - lag;
            }
          })
        );
      }

      node.lateStart = node.lateFinish - node.duration;
      node.float = node.lateStart - node.earlyStart;
    };

    const reverseOrder = [...nodes].reverse();
    reverseOrder.forEach(node => visit(node.id));
  };

  calculateEarlyDates();
  calculateLateDates();

  // Identify critical path (tasks with zero float)
  const criticalPath = nodes
    .filter(n => Math.abs(n.float) < 0.01)
    .map(n => n.id);

  // Find project end date
  const projectEndNode = nodes.reduce((max, node) => 
    node.earlyFinish > (max?.earlyFinish || 0) ? node : max
  , null);

  // Detect bottlenecks - tasks with high successor count + on critical path
  const bottlenecks = [];
  nodes.forEach(node => {
    const successorCount = nodes.filter(n => 
      n.predecessors.some(p => p.predecessor_id === node.id)
    ).length;
    
    const isCritical = criticalPath.includes(node.id);
    
    // Bottleneck criteria: 3+ successors OR (critical + 2+ successors) OR (critical + low float successors)
    if (successorCount >= 3 || (isCritical && successorCount >= 2)) {
      bottlenecks.push({
        taskId: node.id,
        successorCount,
        reason: isCritical 
          ? `Critical path task with ${successorCount} dependent tasks - any delay cascades to project completion`
          : `High-dependency task - delays impact ${successorCount} downstream tasks`,
        riskLevel: successorCount >= 5 ? 'HIGH' : successorCount >= 3 ? 'MEDIUM' : 'LOW'
      });
    }
  });

  // Calculate pathStats
  const pathStats = {
    criticalPathDuration: projectEndNode?.earlyFinish || 0,
    projectEnd: projectEndNode?.task.end_date,
    originalDuration: tasks.some(t => t._simulated) ? tasks[0]?._originalDuration : undefined
  };

  // Store original duration for future comparison
  if (!tasks.some(t => t._simulated)) {
    tasks.forEach(t => t._originalDuration = pathStats.criticalPathDuration);
  }

  return { nodes, edges, criticalPath, pathStats, bottlenecks };
}

function getStatusColor(status) {
  const colors = {
    'not_started': '#3f3f46',
    'in_progress': '#3b82f6',
    'completed': '#22c55e',
    'on_hold': '#f59e0b',
    'blocked': '#ef4444',
    'cancelled': '#71717a'
  };
  return colors[status] || '#3f3f46';
}

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen - 3) + '...' : str;
}