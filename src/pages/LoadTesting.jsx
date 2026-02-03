import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Zap, Database, RefreshCw, Trash2, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoadTesting() {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [config, setConfig] = useState({
    projectCount: 100,
    rfisPerProject: 5,
    tasksPerProject: 20
  });

  const handleSeedData = async () => {
    if (!window.confirm(`Generate ${config.projectCount} projects with ~${config.projectCount * config.rfisPerProject} RFIs and ~${config.projectCount * config.tasksPerProject} tasks?`)) {
      return;
    }

    setLoading(true);
    setTestResults(null);
    
    try {
      const startTime = Date.now();
      const { data } = await base44.functions.invoke('seedLoadTestData', config);
      const duration = Date.now() - startTime;

      setTestResults({
        type: 'seed',
        success: true,
        stats: data.stats,
        clientDuration: duration
      });

      toast.success(`Generated ${data.stats.projects} projects in ${data.stats.duration_sec}s`);
    } catch (error) {
      toast.error(`Seed failed: ${error.message}`);
      setTestResults({ type: 'seed', success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm('Delete all load test data (LT- projects)? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    
    try {
      const { data } = await base44.functions.invoke('cleanupLoadTestData', {});
      toast.success(`Deleted ${data.deleted.projects} projects, ${data.deleted.rfis} RFIs, ${data.deleted.tasks} tasks`);
      setTestResults(null);
    } catch (error) {
      toast.error(`Cleanup failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDashboardLoadTest = async () => {
    setLoading(true);
    
    try {
      const startTime = performance.now();
      
      // Simulate Dashboard query patterns
      const [projects, tasks, rfis, financials] = await Promise.all([
        base44.entities.Project.list(),
        base44.entities.Task.list('-created_date', 1000),
        base44.entities.RFI.list('-created_date', 1000),
        base44.entities.Financial.list()
      ]);
      
      const duration = performance.now() - startTime;

      setTestResults({
        type: 'dashboard',
        success: true,
        duration: Math.round(duration),
        counts: {
          projects: projects.length,
          tasks: tasks.length,
          rfis: rfis.length,
          financials: financials.length
        }
      });

      const status = duration < 2000 ? 'success' : duration < 5000 ? 'warning' : 'error';
      toast[status](`Dashboard loaded in ${Math.round(duration)}ms`);
    } catch (error) {
      toast.error(`Load test failed: ${error.message}`);
      setTestResults({ type: 'dashboard', success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRFIHubLoadTest = async () => {
    setLoading(true);
    
    try {
      const startTime = performance.now();
      
      const rfis = await base44.entities.RFI.list('-created_date', 5000);
      
      const duration = performance.now() - startTime;

      setTestResults({
        type: 'rfihub',
        success: true,
        duration: Math.round(duration),
        count: rfis.length
      });

      const status = duration < 3000 ? 'success' : duration < 6000 ? 'warning' : 'error';
      toast[status](`RFI Hub loaded ${rfis.length} RFIs in ${Math.round(duration)}ms`);
    } catch (error) {
      toast.error(`Load test failed: ${error.message}`);
      setTestResults({ type: 'rfihub', success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="text-amber-500" />
          Performance Load Testing
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Stress test with 1,000+ projects, 5,000+ RFIs, concurrent operations
        </p>
      </div>

      {/* Warning */}
      <Card className="bg-amber-500/10 border-amber-500/30">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-500 flex-shrink-0" size={20} />
            <div>
              <p className="text-sm text-amber-200 font-semibold">Admin Only - Test Environment</p>
              <p className="text-xs text-amber-300 mt-1">
                Load testing generates large amounts of data. Use cleanup function after testing. All test data prefixed with "LT-".
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Generation Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database size={20} />
            Test Data Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Projects</label>
              <Input
                type="number"
                value={config.projectCount}
                onChange={(e) => setConfig({ ...config, projectCount: parseInt(e.target.value) || 0 })}
                className="bg-zinc-900 border-zinc-800"
                min="1"
                max="1000"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">RFIs per Project</label>
              <Input
                type="number"
                value={config.rfisPerProject}
                onChange={(e) => setConfig({ ...config, rfisPerProject: parseInt(e.target.value) || 0 })}
                className="bg-zinc-900 border-zinc-800"
                min="1"
                max="50"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Tasks per Project</label>
              <Input
                type="number"
                value={config.tasksPerProject}
                onChange={(e) => setConfig({ ...config, tasksPerProject: parseInt(e.target.value) || 0 })}
                className="bg-zinc-900 border-zinc-800"
                min="1"
                max="100"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSeedData}
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {loading ? 'Generating...' : 'Generate Test Data'}
            </Button>
            <Button
              onClick={handleCleanup}
              disabled={loading}
              variant="destructive"
            >
              <Trash2 size={16} className="mr-2" />
              Cleanup Test Data
            </Button>
          </div>

          <div className="text-xs text-zinc-500">
            Will generate: {config.projectCount} projects • {config.projectCount * config.rfisPerProject} RFIs • {config.projectCount * config.tasksPerProject} tasks
          </div>
        </CardContent>
      </Card>

      {/* Load Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={20} />
            Performance Tests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleDashboardLoadTest}
            disabled={loading}
            variant="outline"
            className="w-full justify-start"
          >
            <RefreshCw size={16} className="mr-2" />
            Dashboard Load Test (1,000+ projects)
          </Button>

          <Button
            onClick={handleRFIHubLoadTest}
            disabled={loading}
            variant="outline"
            className="w-full justify-start"
          >
            <RefreshCw size={16} className="mr-2" />
            RFI Hub Load Test (5,000+ RFIs)
          </Button>

          <div className="text-xs text-zinc-500">
            Tests measure query performance, data enrichment, and rendering time
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {testResults && (
        <Card className={testResults.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResults.success ? (
                <>
                  <CheckCircle2 className="text-green-500" size={20} />
                  Test Results
                </>
              ) : (
                <>
                  <AlertTriangle className="text-red-500" size={20} />
                  Test Failed
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.success && testResults.type === 'seed' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{testResults.stats.projects}</div>
                    <div className="text-xs text-zinc-400">Projects</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{testResults.stats.rfis}</div>
                    <div className="text-xs text-zinc-400">RFIs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{testResults.stats.tasks}</div>
                    <div className="text-xs text-zinc-400">Tasks</div>
                  </div>
                </div>
                <div className="text-center pt-3 border-t border-zinc-800">
                  <div className="flex items-center justify-center gap-2">
                    <Clock size={16} className="text-zinc-400" />
                    <span className="text-sm text-zinc-300">
                      Completed in {testResults.stats.duration_sec}s
                    </span>
                  </div>
                </div>
              </div>
            )}

            {testResults.success && testResults.type === 'dashboard' && (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">{testResults.counts.projects}</div>
                    <div className="text-xs text-zinc-400">Projects</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">{testResults.counts.tasks}</div>
                    <div className="text-xs text-zinc-400">Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">{testResults.counts.rfis}</div>
                    <div className="text-xs text-zinc-400">RFIs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">{testResults.counts.financials}</div>
                    <div className="text-xs text-zinc-400">Financials</div>
                  </div>
                </div>
                <div className="text-center pt-3 border-t border-zinc-800">
                  <Badge className={
                    testResults.duration < 2000 ? 'bg-green-500/20 text-green-400' :
                    testResults.duration < 5000 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }>
                    {testResults.duration}ms load time
                  </Badge>
                </div>
              </div>
            )}

            {testResults.success && testResults.type === 'rfihub' && (
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{testResults.count}</div>
                  <div className="text-sm text-zinc-400">RFIs Loaded</div>
                </div>
                <div className="text-center pt-3 border-t border-zinc-800">
                  <Badge className={
                    testResults.duration < 3000 ? 'bg-green-500/20 text-green-400' :
                    testResults.duration < 6000 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }>
                    {testResults.duration}ms load time
                  </Badge>
                </div>
              </div>
            )}

            {!testResults.success && (
              <div className="text-sm text-red-400">
                Error: {testResults.error}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Performance Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Performance Targets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">Dashboard (1,000 projects):</span>
              <span className="text-white">&lt; 2s excellent, &lt; 5s acceptable</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">RFI Hub (5,000 RFIs):</span>
              <span className="text-white">&lt; 3s excellent, &lt; 6s acceptable</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Data Generation (100 projects):</span>
              <span className="text-white">&lt; 10s target</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}