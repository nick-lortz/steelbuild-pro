import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { differenceInDays, addDays, format } from 'date-fns';

export default function MonteCarloSimulation({ tasks, projects }) {
  const [simulations, setSimulations] = useState(10000);
  const [variability, setVariability] = useState(0.2); // 20% default
  const [results, setResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const runSimulation = () => {
    setIsRunning(true);
    
    setTimeout(() => {
      const projectCompletions = {};
      
      // Run Monte Carlo simulations
      for (let i = 0; i < simulations; i++) {
        const projectDurations = {};
        
        tasks.forEach(task => {
          if (!task.start_date || !task.end_date || !task.project_id) return;
          
          const baseDuration = differenceInDays(new Date(task.end_date), new Date(task.start_date));
          
          // Apply triangular distribution
          const min = baseDuration * (1 - variability);
          const max = baseDuration * (1 + variability);
          const mode = baseDuration;
          
          // Triangular distribution sampling
          const u = Math.random();
          const simDuration = u < (mode - min) / (max - min)
            ? min + Math.sqrt(u * (max - min) * (mode - min))
            : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
          
          if (!projectDurations[task.project_id]) {
            projectDurations[task.project_id] = 0;
          }
          projectDurations[task.project_id] += simDuration;
        });
        
        // Store results
        Object.keys(projectDurations).forEach(projectId => {
          if (!projectCompletions[projectId]) {
            projectCompletions[projectId] = [];
          }
          projectCompletions[projectId].push(projectDurations[projectId]);
        });
      }
      
      // Calculate statistics
      const projectStats = {};
      Object.keys(projectCompletions).forEach(projectId => {
        const durations = projectCompletions[projectId].sort((a, b) => a - b);
        const project = projects.find(p => p.id === projectId);
        
        projectStats[projectId] = {
          project,
          mean: durations.reduce((a, b) => a + b, 0) / durations.length,
          p10: durations[Math.floor(durations.length * 0.1)],
          p50: durations[Math.floor(durations.length * 0.5)],
          p90: durations[Math.floor(durations.length * 0.9)],
          min: durations[0],
          max: durations[durations.length - 1],
          distribution: createDistribution(durations),
        };
      });
      
      setResults(projectStats);
      setIsRunning(false);
    }, 100);
  };

  const createDistribution = (durations) => {
    const bins = 20;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const binSize = (max - min) / bins;
    
    const distribution = [];
    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binSize;
      const binEnd = binStart + binSize;
      const count = durations.filter(d => d >= binStart && d < binEnd).length;
      distribution.push({
        range: Math.round(binStart),
        count,
        probability: (count / durations.length) * 100,
      });
    }
    return distribution;
  };

  const getConfidenceLevel = (p10, p50, target) => {
    if (!target) return null;
    if (target >= p50) return 'high';
    if (target >= p10) return 'medium';
    return 'low';
  };

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={20} className="text-amber-500" />
            Monte Carlo Schedule Simulation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-zinc-400">Number of Simulations</Label>
              <Input
                type="number"
                value={simulations}
                onChange={(e) => setSimulations(Number(e.target.value))}
                min={1000}
                max={50000}
                step={1000}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div>
              <Label className="text-zinc-400">Duration Variability (%)</Label>
              <Input
                type="number"
                value={variability * 100}
                onChange={(e) => setVariability(Number(e.target.value) / 100)}
                min={5}
                max={50}
                step={5}
                className="bg-zinc-800 border-zinc-700"
              />
              <p className="text-xs text-zinc-500 mt-1">±{(variability * 100).toFixed(0)}% from baseline</p>
            </div>
            <div className="flex items-end">
              <Button
                onClick={runSimulation}
                disabled={isRunning || tasks.length === 0}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black"
              >
                <Play size={16} className="mr-2" />
                {isRunning ? 'Running...' : 'Run Simulation'}
              </Button>
            </div>
          </div>

          {tasks.length === 0 && (
            <div className="p-4 bg-zinc-800/50 rounded-lg text-center text-zinc-400">
              No tasks available. Add tasks with dates to run simulation.
            </div>
          )}
        </CardContent>
      </Card>

      {results && Object.keys(results).map(projectId => {
        const stat = results[projectId];
        const project = stat.project;
        const targetDuration = project?.target_completion && project?.start_date
          ? differenceInDays(new Date(project.target_completion), new Date(project.start_date))
          : null;
        
        const confidence = getConfidenceLevel(stat.p10, stat.p50, targetDuration);
        
        return (
          <Card key={projectId} className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base">
                {project?.name || 'Unknown Project'} - Simulation Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500">Mean Duration</p>
                  <p className="text-lg font-bold text-white">{Math.round(stat.mean)} days</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500">P10 (Optimistic)</p>
                  <p className="text-lg font-bold text-green-400">{Math.round(stat.p10)} days</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500">P50 (Median)</p>
                  <p className="text-lg font-bold text-amber-400">{Math.round(stat.p50)} days</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500">P90 (Pessimistic)</p>
                  <p className="text-lg font-bold text-red-400">{Math.round(stat.p90)} days</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500">Range</p>
                  <p className="text-lg font-bold text-white">
                    {Math.round(stat.min)}-{Math.round(stat.max)} days
                  </p>
                </div>
              </div>

              {/* Target Comparison */}
              {targetDuration && (
                <div className={`p-4 rounded-lg border ${
                  confidence === 'high' ? 'bg-green-500/10 border-green-500/30' :
                  confidence === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
                  'bg-red-500/10 border-red-500/30'
                }`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className={
                      confidence === 'high' ? 'text-green-400' :
                      confidence === 'medium' ? 'text-amber-400' :
                      'text-red-400'
                    } />
                    <div className="flex-1">
                      <p className="font-medium text-white">
                        Target: {targetDuration} days
                        {project.target_completion && ` (${format(new Date(project.target_completion), 'MMM d, yyyy')})`}
                      </p>
                      <p className="text-sm text-zinc-300 mt-1">
                        {confidence === 'high' && 'High confidence of meeting deadline (target > P50)'}
                        {confidence === 'medium' && 'Medium confidence (target between P10-P50)'}
                        {confidence === 'low' && 'Low confidence - target is aggressive (target < P10)'}
                      </p>
                      <p className="text-xs text-zinc-400 mt-2">
                        Buffer needed: ~{Math.max(0, Math.round(stat.p90 - targetDuration))} days
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Distribution Chart */}
              <div>
                <h4 className="text-sm font-medium text-white mb-3">Duration Distribution</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stat.distribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis 
                      dataKey="range" 
                      stroke="#a1a1aa"
                      label={{ value: 'Days', position: 'insideBottom', offset: -5, fill: '#a1a1aa' }}
                    />
                    <YAxis 
                      stroke="#a1a1aa"
                      label={{ value: 'Probability (%)', angle: -90, position: 'insideLeft', fill: '#a1a1aa' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                      formatter={(value) => `${value.toFixed(2)}%`}
                    />
                    <Bar dataKey="probability" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}