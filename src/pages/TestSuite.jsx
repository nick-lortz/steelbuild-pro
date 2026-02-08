import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, CheckCircle2, XCircle, Clock, AlertTriangle, 
  Shield, Database, DollarSign, FileText, Workflow, Bug 
} from 'lucide-react';
import { toast } from 'sonner';

export default function TestSuite() {
  const [selectedSuite, setSelectedSuite] = useState('all');
  const [testResults, setTestResults] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.auth.me()
  });

  const runTestsMutation = useMutation({
    mutationFn: async (suite) => {
      const response = await base44.functions.invoke('testRunner', { test_suite: suite });
      return response.data;
    },
    onSuccess: (data) => {
      setTestResults(data);
      if (data.failed === 0) {
        toast.success(`All ${data.passed} tests passed! ✓`);
      } else {
        toast.error(`${data.failed} test(s) failed`);
      }
    },
    onError: (error) => {
      toast.error('Test execution failed: ' + error.message);
    }
  });

  const testSuites = [
    { id: 'all', name: 'All Tests', icon: Play, color: 'text-white' },
    { id: 'auth', name: 'Authentication', icon: Shield, color: 'text-blue-400' },
    { id: 'authorization', name: 'Authorization', icon: Shield, color: 'text-purple-400' },
    { id: 'data_integrity', name: 'Data Integrity', icon: Database, color: 'text-green-400' },
    { id: 'financial', name: 'Financial Lifecycle', icon: DollarSign, color: 'text-amber-400' },
    { id: 'rfi', name: 'RFI Lifecycle', icon: FileText, color: 'text-cyan-400' },
    { id: 'e2e', name: 'E2E Critical Path', icon: Workflow, color: 'text-pink-400' },
    { id: 'error_handling', name: 'Error Handling', icon: Bug, color: 'text-red-400' }
  ];

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="bg-zinc-900 border-zinc-800 max-w-md">
          <CardContent className="p-8 text-center">
            <Shield size={48} className="mx-auto mb-4 text-red-400" />
            <h2 className="text-xl font-bold text-white mb-2">Admin Access Required</h2>
            <p className="text-sm text-zinc-400">Only administrators can run the test suite.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Automated Test Suite</h1>
          <p className="text-sm text-zinc-400">
            P0 release validation tests - Authentication, Authorization, Data Integrity, Workflows
          </p>
        </div>

        {/* Test Suite Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {testSuites.map(suite => {
            const Icon = suite.icon;
            const isSelected = selectedSuite === suite.id;
            
            return (
              <button
                key={suite.id}
                onClick={() => setSelectedSuite(suite.id)}
                className={`p-4 rounded-lg border transition-all ${
                  isSelected 
                    ? 'bg-amber-500 border-amber-500 text-black' 
                    : 'bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700'
                }`}
              >
                <Icon size={20} className={isSelected ? 'text-black' : suite.color} />
                <p className="text-xs font-semibold mt-2">{suite.name}</p>
              </button>
            );
          })}
        </div>

        {/* Run Button */}
        <div className="mb-8">
          <Button
            onClick={() => runTestsMutation.mutate(selectedSuite)}
            disabled={runTestsMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8"
            size="lg"
          >
            {runTestsMutation.isPending ? (
              <>
                <Clock size={18} className="mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play size={18} className="mr-2" />
                Run {testSuites.find(s => s.id === selectedSuite)?.name || 'Tests'}
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        {testResults && (
          <div className="space-y-6">
            {/* Summary */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">{testResults.total}</div>
                    <div className="text-xs text-zinc-500 uppercase mt-1">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">{testResults.passed}</div>
                    <div className="text-xs text-zinc-500 uppercase mt-1">Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-400">{testResults.failed}</div>
                    <div className="text-xs text-zinc-500 uppercase mt-1">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-zinc-400">{testResults.skipped}</div>
                    <div className="text-xs text-zinc-500 uppercase mt-1">Skipped</div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-zinc-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Success Rate</span>
                    <span className="text-2xl font-bold text-white">{testResults.success_rate}%</span>
                  </div>
                  <div className="w-full bg-zinc-700 h-2 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${testResults.success_rate}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Individual Test Results */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Test Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testResults.tests.map((test, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        test.status === 'passed'
                          ? 'bg-green-500/10 border-green-500/30'
                          : test.status === 'failed'
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-zinc-800 border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {test.status === 'passed' ? (
                            <CheckCircle2 size={18} className="text-green-400 mt-0.5" />
                          ) : test.status === 'failed' ? (
                            <XCircle size={18} className="text-red-400 mt-0.5" />
                          ) : (
                            <Clock size={18} className="text-zinc-500 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{test.name}</p>
                            {test.suite && (
                              <p className="text-xs text-zinc-500 mt-0.5">{test.suite}</p>
                            )}
                            {test.error && (
                              <p className="text-xs text-red-400 mt-2 font-mono bg-black/30 p-2 rounded">
                                {test.error}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {test.duration_ms}ms
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!testResults && !runTestsMutation.isPending && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-12 text-center">
              <Play size={48} className="mx-auto mb-4 text-zinc-700" />
              <p className="text-zinc-500">Select a test suite and click Run to begin</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
