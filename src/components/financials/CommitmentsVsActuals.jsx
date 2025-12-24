import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle } from 'lucide-react';

export default function CommitmentsVsActuals({ financials, projects }) {
  const projectData = projects.slice(0, 8).map(project => {
    const projectFinancials = financials.filter(f => f.project_id === project.id);
    const committed = projectFinancials.reduce((sum, f) => sum + (f.committed_amount || 0), 0);
    const actual = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
    
    return {
      name: project.project_number,
      committed,
      actual,
      overCommitted: actual > committed
    };
  }).filter(d => d.committed > 0 || d.actual > 0);

  const overCommittedCount = projectData.filter(d => d.overCommitted).length;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Commitments vs. Actuals</CardTitle>
          {overCommittedCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <AlertTriangle size={14} />
              {overCommittedCount} over commitment
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={projectData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis dataKey="name" stroke="#a1a1aa" />
            <YAxis stroke="#a1a1aa" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
              formatter={(value) => `$${value.toLocaleString()}`}
            />
            <Legend />
            <Bar dataKey="committed" fill="#3b82f6" name="Committed" />
            <Bar dataKey="actual" fill="#8b5cf6" name="Actual" />
          </BarChart>
        </ResponsiveContainer>
        
        {/* Details */}
        <div className="mt-4 space-y-2">
          {projectData.filter(d => d.overCommitted).map(project => (
            <div key={project.name} className="p-2 bg-amber-500/5 border border-amber-500/20 rounded flex items-center justify-between">
              <span className="text-sm text-zinc-300">{project.name}</span>
              <div className="text-right">
                <p className="text-sm text-amber-400">
                  ${(project.actual - project.committed).toLocaleString()} over
                </p>
                <p className="text-xs text-zinc-500">
                  Actual: ${project.actual.toLocaleString()} | Committed: ${project.committed.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}