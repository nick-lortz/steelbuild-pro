import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SkillMatrixView({ resources, tasks, projects }) {
  const skillMatrix = useMemo(() => {
    if (!resources) return { skills: [], matrix: [] };

    // Collect all unique skills
    const allSkills = new Set();
    resources.forEach(r => r.skills?.forEach(s => allSkills.add(s)));
    const skills = Array.from(allSkills).sort();

    // Build matrix
    const matrix = resources.map(resource => {
      const row = {
        resource,
        skillMap: {},
        demand: 0,
        availability: resource.status === 'available'
      };

      skills.forEach(skill => {
        row.skillMap[skill] = resource.skills?.includes(skill) || false;
      });

      // Calculate demand (upcoming tasks)
      const upcomingTasks = tasks?.filter(t => 
        t.assigned_resources?.includes(resource.id) &&
        t.status !== 'completed'
      ).length || 0;

      row.demand = upcomingTasks;

      return row;
    });

    // Calculate skill availability
    const skillAvailability = {};
    skills.forEach(skill => {
      const withSkill = matrix.filter(r => r.skillMap[skill]);
      const available = withSkill.filter(r => r.availability).length;
      const total = withSkill.length;
      skillAvailability[skill] = { available, total };
    });

    return { skills, matrix, skillAvailability };
  }, [resources, tasks]);

  const getProjectsNeedingSkill = (skill) => {
    if (!tasks || !projects) return [];
    
    const projectIds = new Set();
    tasks.forEach(task => {
      if (task.status !== 'completed' && !task.assigned_resources?.length) {
        // Find resources with this skill
        const matchingResources = resources?.filter(r => r.skills?.includes(skill)) || [];
        if (matchingResources.length > 0) {
          projectIds.add(task.project_id);
        }
      }
    });

    return projects.filter(p => projectIds.has(p.id));
  };

  return (
    <div className="space-y-4">
      {/* Skill Availability Summary */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Skill Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {skillMatrix.skills.map(skill => {
              const avail = skillMatrix.skillAvailability[skill];
              const pct = avail.total > 0 ? (avail.available / avail.total * 100) : 0;
              const isLow = pct < 40;

              return (
                <div 
                  key={skill}
                  className={cn(
                    "p-3 rounded-lg border",
                    isLow ? "bg-red-900/10 border-red-500/30" : "bg-zinc-800 border-zinc-700"
                  )}
                >
                  <p className="text-xs font-semibold mb-1">{skill}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">
                      {avail.available} / {avail.total}
                    </span>
                    <span className={cn(
                      "text-xs font-semibold",
                      isLow ? "text-red-400" : "text-green-400"
                    )}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Matrix Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800">
                <tr>
                  <th className="text-left p-3 font-semibold w-48 sticky left-0 bg-zinc-900">Resource</th>
                  <th className="text-left p-3 font-semibold w-24">Status</th>
                  <th className="text-left p-3 font-semibold w-24">Demand</th>
                  {skillMatrix.skills.map(skill => (
                    <th key={skill} className="text-center p-3 font-semibold w-24">
                      <div className="transform -rotate-45 origin-center text-xs">
                        {skill}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {skillMatrix.matrix.map((row, idx) => (
                  <tr key={row.resource.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="p-3 sticky left-0 bg-zinc-900">
                      <div>
                        <p className="font-semibold">{row.resource.name}</p>
                        <p className="text-xs text-zinc-400">{row.resource.classification || row.resource.type}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge 
                        variant={row.availability ? 'outline' : 'secondary'}
                        className={row.availability ? 'text-green-400 border-green-400' : ''}
                      >
                        {row.resource.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <span className={cn(
                        "font-semibold",
                        row.demand > 3 ? "text-red-400" : row.demand > 0 ? "text-amber-400" : "text-zinc-400"
                      )}>
                        {row.demand}
                      </span>
                    </td>
                    {skillMatrix.skills.map(skill => (
                      <td key={skill} className="p-3 text-center">
                        {row.skillMap[skill] ? (
                          <CheckCircle2 size={16} className="text-green-400 inline" />
                        ) : (
                          <Circle size={16} className="text-zinc-700 inline" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}