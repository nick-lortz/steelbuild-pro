import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, TrendingDown, Search } from 'lucide-react';

export default function SkillGapAnalysis({ projects, resources, tasks }) {
  const [expandedGap, setExpandedGap] = useState(null);

  const analysis = useMemo(() => {
    // Define industry-standard skill requirements by project type and phase
    const skillRequirementsByType = {
      'MVD': ['AWS D1.1 Welding', 'High-Strength Bolting', 'Crane Rigging', 'Steel Erection', 'Detailing (Tekla)', 'QC/QA Inspection'],
      'Warehouse': ['Structural Welding', 'Joist Installation', 'Deck Installation', 'Crane Operation', 'Fabrication', 'Blueprint Reading'],
      'Commercial': ['Ornamental Welding', 'Architectural Fabrication', 'Stair & Rail', 'Glass Installation', 'Detailing (SDS2)', 'Finish Work'],
      'Industrial': ['Heavy Welding', 'Equipment Setting', 'Fireproofing', 'Complex Rigging', 'OSHA 30', 'Confined Space Entry'],
      'Bridge': ['AISC Certification', 'Post-Tensioning', 'Bridge Erection', 'Heavy Rigging', 'NBIS Inspection', 'High-Elevation Work'],
    };

    const skillRequirementsByPhase = {
      detailing: ['Tekla Structures', 'SDS2', 'AutoCAD', 'Revit', 'Connection Design', 'BIM Coordination'],
      fabrication: ['AWS Welding Certification', 'CNC Operation', 'Plasma Cutting', 'Fitting & Assembly', 'Drill Press', 'Shop Safety'],
      erection: ['Crane Signals', 'Rigging', 'Torque Wrench', 'Bolting', 'Field Welding', 'Fall Protection', 'Steel Erection Safety'],
    };

    // Aggregate required skills from active projects
    const requiredSkills = new Set();
    const activeProjects = projects.filter(p => ['awarded', 'in_progress'].includes(p.status));

    activeProjects.forEach(project => {
      const jobType = project.structure_anatomy_job_type || 'Commercial';
      const phase = project.phase || 'fabrication';

      // Add skills based on job type
      (skillRequirementsByType[jobType] || skillRequirementsByType['Commercial']).forEach(skill => 
        requiredSkills.add(skill)
      );

      // Add skills based on phase
      (skillRequirementsByPhase[phase] || []).forEach(skill => 
        requiredSkills.add(skill)
      );
    });

    // Extract skills from current workforce
    const availableSkills = new Map();
    resources.forEach(r => {
      if (r.status === 'available' || r.status === 'assigned') {
        (r.skills || []).forEach(skill => {
          if (!availableSkills.has(skill)) {
            availableSkills.set(skill, []);
          }
          availableSkills.get(skill).push({
            name: r.name,
            type: r.type,
            classification: r.classification
          });
        });
        
        // Include certifications as skills
        (r.certifications || []).forEach(cert => {
          if (!availableSkills.has(cert)) {
            availableSkills.set(cert, []);
          }
          availableSkills.get(cert).push({
            name: r.name,
            type: r.type,
            classification: r.classification
          });
        });
      }
    });

    // Identify gaps
    const skillGaps = [];
    const skillSurplus = [];

    requiredSkills.forEach(skill => {
      const count = availableSkills.get(skill)?.length || 0;
      const demand = activeProjects.length; // Simplified: 1 per project
      
      if (count === 0) {
        skillGaps.push({
          skill,
          have: 0,
          need: demand,
          gap: demand,
          severity: 'critical',
          resourcesWith: []
        });
      } else if (count < demand) {
        skillGaps.push({
          skill,
          have: count,
          need: demand,
          gap: demand - count,
          severity: 'moderate',
          resourcesWith: availableSkills.get(skill)
        });
      }
    });

    // Skills we have but aren't currently needed
    availableSkills.forEach((resourceList, skill) => {
      if (!requiredSkills.has(skill)) {
        skillSurplus.push({
          skill,
          count: resourceList.length,
          resources: resourceList
        });
      }
    });

    // Critical skills (always needed in steel)
    const criticalSkills = [
      'AWS D1.1 Welding',
      'Steel Erection',
      'Crane Rigging',
      'OSHA 10',
      'OSHA 30',
      'Blueprint Reading',
      'Tekla Structures',
      'High-Strength Bolting'
    ];

    const criticalGaps = skillGaps.filter(gap => 
      criticalSkills.some(cs => gap.skill.toLowerCase().includes(cs.toLowerCase()))
    );

    return {
      totalGaps: skillGaps.length,
      criticalGaps: criticalGaps.length,
      gaps: skillGaps.sort((a, b) => {
        if (a.severity === 'critical' && b.severity !== 'critical') return -1;
        if (a.severity !== 'critical' && b.severity === 'critical') return 1;
        return b.gap - a.gap;
      }),
      surplus: skillSurplus,
      coverageRate: requiredSkills.size > 0 
        ? Math.round(((requiredSkills.size - skillGaps.length) / requiredSkills.size) * 100)
        : 100
    };
  }, [projects, resources, tasks]);

  const getSeverityColor = (severity) => {
    return severity === 'critical' 
      ? 'bg-red-500 text-white' 
      : 'bg-amber-500 text-black';
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Search size={20} className="text-amber-500" />
          Skill-Gap Analysis
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Workforce skills vs project requirements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-zinc-800 rounded border border-zinc-700">
            <p className="text-xs text-zinc-400 mb-1">Skill Coverage</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${
                analysis.coverageRate >= 80 ? 'text-green-400' :
                analysis.coverageRate >= 60 ? 'text-amber-400' :
                'text-red-400'
              }`}>
                {analysis.coverageRate}%
              </span>
              {analysis.coverageRate < 80 && (
                <TrendingDown size={16} className="text-red-400" />
              )}
            </div>
          </div>

          <div className="p-4 bg-zinc-800 rounded border border-zinc-700">
            <p className="text-xs text-zinc-400 mb-1">Total Gaps</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{analysis.totalGaps}</span>
              {analysis.totalGaps === 0 && (
                <CheckCircle2 size={16} className="text-green-400" />
              )}
            </div>
          </div>

          <div className="p-4 bg-zinc-800 rounded border border-zinc-700">
            <p className="text-xs text-zinc-400 mb-1">Critical Gaps</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${
                analysis.criticalGaps > 0 ? 'text-red-400' : 'text-green-400'
              }`}>
                {analysis.criticalGaps}
              </span>
              {analysis.criticalGaps > 0 && (
                <AlertCircle size={16} className="text-red-400" />
              )}
            </div>
          </div>
        </div>

        {/* Skill Gaps */}
        <div>
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Missing or Understaffed Skills</h3>
          {analysis.gaps.length === 0 ? (
            <div className="flex items-center gap-2 text-green-400 text-sm p-3 bg-zinc-800 rounded border border-zinc-700">
              <CheckCircle2 size={16} />
              <span>All project skill requirements are met</span>
            </div>
          ) : (
            <div className="space-y-2">
              {analysis.gaps.slice(0, 10).map((gap, idx) => (
                <div key={idx} className="bg-zinc-800 rounded border border-zinc-700">
                  <div 
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-750"
                    onClick={() => setExpandedGap(expandedGap === idx ? null : idx)}
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle size={16} className={gap.severity === 'critical' ? 'text-red-500' : 'text-amber-500'} />
                      <div>
                        <p className="text-sm font-medium text-white">{gap.skill}</p>
                        <p className="text-xs text-zinc-400">
                          Have: {gap.have} | Need: {gap.need} | Gap: {gap.gap}
                        </p>
                      </div>
                    </div>
                    <Badge className={getSeverityColor(gap.severity)}>
                      {gap.severity}
                    </Badge>
                  </div>
                  
                  {expandedGap === idx && gap.resourcesWith.length > 0 && (
                    <div className="px-3 pb-3 pt-1 border-t border-zinc-700">
                      <p className="text-xs text-zinc-400 mb-2">Current resources with this skill:</p>
                      <div className="space-y-1">
                        {gap.resourcesWith.map((r, i) => (
                          <div key={i} className="text-xs text-zinc-300">
                            • {r.name} ({r.type}{r.classification ? ` - ${r.classification}` : ''})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Recommendations */}
        {analysis.criticalGaps > 0 && (
          <div className="p-4 bg-red-950 border border-red-800 rounded">
            <h3 className="text-sm font-medium text-red-400 mb-2">Recommended Actions</h3>
            <ul className="text-xs text-red-200 space-y-1 list-disc list-inside">
              <li>Prioritize hiring or training for critical skill gaps</li>
              <li>Consider subcontracting for short-term needs</li>
              <li>Review project schedules to stagger skill-intensive phases</li>
              <li>Develop cross-training program for existing workforce</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}