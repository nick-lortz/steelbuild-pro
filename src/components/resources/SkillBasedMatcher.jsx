import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Target, CheckCircle2, AlertTriangle, User } from 'lucide-react';

export default function SkillBasedMatcher({ 
  requiredSkills = [], 
  requiredClassification, 
  minSkillLevel,
  resources, 
  onSelectResource 
}) {
  const matchedResources = useMemo(() => {
    if (!resources || resources.length === 0) return [];

    const skillLevelRank = {
      'apprentice': 1,
      'journeyman': 2,
      'foreman': 3,
      'lead': 4,
      'specialist': 5
    };

    return resources
      .map(resource => {
        let score = 0;
        let matchReasons = [];

        // Classification match
        if (requiredClassification && resource.classification === requiredClassification) {
          score += 40;
          matchReasons.push(`${requiredClassification} certified`);
        }

        // Skill matching
        const resourceSkills = resource.skills || [];
        const matchedSkills = requiredSkills.filter(skill => 
          resourceSkills.some(rs => rs.toLowerCase().includes(skill.toLowerCase()))
        );
        
        if (matchedSkills.length > 0) {
          score += (matchedSkills.length / requiredSkills.length) * 40;
          matchReasons.push(`${matchedSkills.length}/${requiredSkills.length} skills match`);
        }

        // Skill level match
        if (minSkillLevel && resource.skill_level) {
          const resourceLevel = skillLevelRank[resource.skill_level] || 0;
          const requiredLevel = skillLevelRank[minSkillLevel] || 0;
          
          if (resourceLevel >= requiredLevel) {
            score += 15;
            matchReasons.push(`${resource.skill_level} level`);
          } else {
            score -= 10;
            matchReasons.push(`Below required level`);
          }
        }

        // Availability bonus
        if (resource.status === 'available') {
          score += 5;
          matchReasons.push('Currently available');
        } else if (resource.status === 'unavailable') {
          score -= 20;
          matchReasons.push('Unavailable');
        }

        return {
          resource,
          score: Math.max(0, Math.min(100, score)),
          matchReasons,
          matchedSkills,
          isGoodMatch: score >= 60,
          isFairMatch: score >= 40 && score < 60,
          isPoorMatch: score < 40
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [resources, requiredSkills, requiredClassification, minSkillLevel]);

  const goodMatches = matchedResources.filter(m => m.isGoodMatch);
  const fairMatches = matchedResources.filter(m => m.isFairMatch);
  const poorMatches = matchedResources.filter(m => m.isPoorMatch);

  if (!requiredSkills || requiredSkills.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-8 text-center">
          <Target size={40} className="mx-auto mb-3 text-zinc-700" />
          <p className="text-sm text-zinc-500">Specify required skills to see matching resources</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Award size={20} className="text-amber-500" />
          Skill-Based Resource Matching
        </CardTitle>
        <div className="flex flex-wrap gap-2 mt-3">
          <p className="text-xs text-zinc-400 mr-2">Required:</p>
          {requiredSkills.map((skill, idx) => (
            <Badge key={idx} variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">
              {skill}
            </Badge>
          ))}
          {requiredClassification && (
            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs">
              {requiredClassification}
            </Badge>
          )}
          {minSkillLevel && (
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
              Min: {minSkillLevel}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Best Matches */}
        {goodMatches.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={16} className="text-green-400" />
              <h4 className="text-sm font-bold text-green-400">Strong Matches ({goodMatches.length})</h4>
            </div>
            <div className="space-y-2">
              {goodMatches.map(({ resource, score, matchReasons, matchedSkills }) => (
                <div 
                  key={resource.id}
                  className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg hover:bg-green-500/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User size={16} className="text-green-400" />
                        <span className="font-semibold text-white">{resource.name}</span>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                          {score}% match
                        </Badge>
                        {resource.status === 'available' && (
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                            Available
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400">
                        {resource.classification} • {resource.skill_level}
                      </p>
                    </div>
                    {onSelectResource && (
                      <Button
                        size="sm"
                        onClick={() => onSelectResource(resource)}
                        className="bg-green-500 hover:bg-green-600 text-black"
                      >
                        Assign
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    {matchedSkills.map((skill, idx) => (
                      <Badge key={idx} className="bg-green-500/20 text-green-300 text-[10px]">
                        ✓ {skill}
                      </Badge>
                    ))}
                    {resource.skills?.filter(s => !matchedSkills.includes(s)).slice(0, 3).map((skill, idx) => (
                      <Badge key={idx} variant="outline" className="text-[10px] text-zinc-500">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  
                  <p className="text-xs text-zinc-500 italic">
                    {matchReasons.join(' • ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fair Matches */}
        {fairMatches.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-400" />
              <h4 className="text-sm font-bold text-amber-400">Partial Matches ({fairMatches.length})</h4>
            </div>
            <div className="space-y-2">
              {fairMatches.slice(0, 3).map(({ resource, score, matchReasons, matchedSkills }) => (
                <div 
                  key={resource.id}
                  className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white text-sm">{resource.name}</span>
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                          {score}% match
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {resource.classification} • {resource.skill_level}
                      </p>
                    </div>
                    {onSelectResource && (
                      <Button
                        size="sm"
                        onClick={() => onSelectResource(resource)}
                        variant="outline"
                        className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      >
                        Assign
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600">{matchReasons.join(' • ')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Good Matches */}
        {goodMatches.length === 0 && fairMatches.length === 0 && (
          <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-lg text-center">
            <AlertTriangle size={40} className="mx-auto mb-3 text-red-400" />
            <p className="text-sm text-red-400 font-bold mb-1">No suitable resources found</p>
            <p className="text-xs text-zinc-500">
              Consider hiring or subcontracting for required skills: {requiredSkills.join(', ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}