import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Hammer, Wrench, Package } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const RISK_COLORS = {
  LOW: 'text-green-400 bg-green-500/10 border-green-500/30',
  MED: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  HIGH: 'text-red-400 bg-red-500/10 border-red-500/30',
  CRITICAL: 'text-red-300 bg-red-700/20 border-red-500/40',
};

const SCORE_COLOR = (score) => {
  if (score >= 80) return 'text-green-400';
  if (score >= 55) return 'text-amber-400';
  return 'text-red-400';
};

function ScoreRing({ score, label, icon: Icon }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`text-3xl font-bold font-mono ${SCORE_COLOR(score)}`}>{score}</div>
      <div className="text-xs text-zinc-500 uppercase tracking-wide">{label}</div>
      {Icon && <Icon size={14} className="text-zinc-600" />}
    </div>
  );
}

function CheckRow({ label, passed, detail }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-zinc-800 last:border-0">
      {passed
        ? <CheckCircle2 size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
        : <XCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
      }
      <div className="flex-1 min-w-0">
        <span className={`text-xs ${passed ? 'text-zinc-400' : 'text-zinc-200'}`}>{label}</span>
        {!passed && detail && <div className="text-xs text-zinc-500 mt-0.5">{detail}</div>}
      </div>
    </div>
  );
}

export default function ReadinessScorePanel({ workPackageId, projectId, targetErectionStart }) {
  const [fri, setFri] = useState(null);
  const [eii, setEii] = useState(null);
  const [mis, setMis] = useState(null);
  const [loading, setLoading] = useState({ fri: false, eii: false, mis: false });

  const runFRI = async () => {
    setLoading(l => ({ ...l, fri: true }));
    const { data } = await base44.functions.invoke('computeFRI', { work_package_id: workPackageId, project_id: projectId });
    setFri(data);
    setLoading(l => ({ ...l, fri: false }));
  };

  const runEII = async () => {
    setLoading(l => ({ ...l, eii: true }));
    const { data } = await base44.functions.invoke('computeEII', { work_package_id: workPackageId, project_id: projectId });
    setEii(data);
    setLoading(l => ({ ...l, eii: false }));
  };

  const runMIS = async () => {
    setLoading(l => ({ ...l, mis: true }));
    const { data } = await base44.functions.invoke('computeMIS', { project_id: projectId, target_erection_start: targetErectionStart });
    setMis(data);
    setLoading(l => ({ ...l, mis: false }));
  };

  const runAll = async () => {
    await Promise.all([runFRI(), runEII(), runMIS()]);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Readiness Indices</h3>
        <Button size="sm" variant="outline" onClick={runAll} disabled={Object.values(loading).some(Boolean)}>
          <RefreshCw size={13} className={`mr-1.5 ${Object.values(loading).some(Boolean) ? 'animate-spin' : ''}`} />
          Run All
        </Button>
      </div>

      {/* Score Summary Bar */}
      {(fri || eii || mis) && (
        <div className="grid grid-cols-3 gap-3 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
          {fri && <ScoreRing score={fri.fri_score} label="FRI" icon={Wrench} />}
          {eii && <ScoreRing score={eii.eii_score} label="EII" icon={Hammer} />}
          {mis && <ScoreRing score={100 - mis.mis_score} label="MIS" icon={Package} />}
        </div>
      )}

      {/* FRI Card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench size={14} className="text-orange-400" />
              Fabrication Readiness Index
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={runFRI} disabled={loading.fri}>
              <RefreshCw size={12} className={loading.fri ? 'animate-spin' : ''} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {fri ? (
            <>
              <div className="flex items-center justify-between">
                <Progress value={fri.fri_score} className="flex-1 mr-3 h-2" />
                <span className={`text-lg font-bold font-mono ${SCORE_COLOR(fri.fri_score)}`}>{fri.fri_score}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={fri.safe_to_fabricate ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'}>
                  {fri.safe_to_fabricate ? '✓ SAFE TO FABRICATE' : '✗ NOT READY'}
                </Badge>
              </div>
              {fri.hold_recommendation && (
                <div className={`text-xs p-2 rounded border ${fri.safe_to_fabricate ? 'border-green-500/20 text-green-400 bg-green-500/5' : 'border-amber-500/20 text-amber-400 bg-amber-500/5'}`}>
                  {fri.hold_recommendation}
                </div>
              )}
              <div className="space-y-0">
                {fri.checks?.map(c => (
                  <CheckRow key={c.key} label={c.label} passed={c.passed} detail={c.detail} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-xs text-zinc-500 text-center py-4">Run to compute FRI</div>
          )}
        </CardContent>
      </Card>

      {/* EII Card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Hammer size={14} className="text-blue-400" />
              Erection Installability Index
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={runEII} disabled={loading.eii}>
              <RefreshCw size={12} className={loading.eii ? 'animate-spin' : ''} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {eii ? (
            <>
              <div className="flex items-center justify-between">
                <Progress value={eii.eii_score} className="flex-1 mr-3 h-2" />
                <span className={`text-lg font-bold font-mono ${SCORE_COLOR(eii.eii_score)}`}>{eii.eii_score}%</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={
                  eii.install_risk === 'LOW' ? 'bg-green-700' :
                  eii.install_risk === 'MED' ? 'bg-amber-700' : 'bg-red-700'
                }>
                  Install Risk: {eii.install_risk}
                </Badge>
                <span className="text-xs text-zinc-400">
                  Schedule Compression: <span className={`font-medium ${eii.schedule_compression_risk_pct > 30 ? 'text-red-400' : 'text-zinc-300'}`}>
                    {eii.schedule_compression_risk_pct}%
                  </span>
                </span>
              </div>
              <div className="space-y-0">
                {eii.checks?.map(c => (
                  <CheckRow key={c.key} label={c.label} passed={c.passed} />
                ))}
              </div>
              {eii.risk_factors?.length > 0 && (
                <div className="space-y-1 pt-1">
                  {eii.risk_factors.map((rf, i) => (
                    <div key={i} className={`text-xs p-2 rounded border ${RISK_COLORS[rf.severity]}`}>
                      <span className="font-medium">{rf.factor.replace(/_/g, ' ').toUpperCase()}:</span> {rf.detail}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-zinc-500 text-center py-4">Run to compute EII</div>
          )}
        </CardContent>
      </Card>

      {/* MIS Card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package size={14} className="text-purple-400" />
              Material Impact Score
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={runMIS} disabled={loading.mis}>
              <RefreshCw size={12} className={loading.mis ? 'animate-spin' : ''} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {mis ? (
            <>
              <div className="flex items-center justify-between">
                <Progress value={mis.mis_score} className="flex-1 mr-3 h-2" />
                <span className={`text-lg font-bold font-mono ${mis.mis_score >= 70 ? 'text-red-400' : mis.mis_score >= 45 ? 'text-amber-400' : 'text-green-400'}`}>
                  {mis.mis_score}% risk
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={
                  mis.impact_level === 'LOW' ? 'bg-green-700' :
                  mis.impact_level === 'MED' ? 'bg-amber-700' :
                  mis.impact_level === 'CRITICAL' ? 'bg-red-900' : 'bg-red-700'
                }>
                  {mis.impact_level}
                </Badge>
                {mis.projected_erection_delay_days > 0 && (
                  <span className="text-xs text-red-400">
                    ~{mis.projected_erection_delay_days}d projected delay
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">{mis.summary}</p>
              {mis.impacts?.length > 0 && (
                <div className="space-y-1">
                  {mis.impacts.map((imp, i) => (
                    <div key={i} className={`text-xs p-2 rounded border ${RISK_COLORS[imp.risk]}`}>
                      <span className="font-medium">{imp.label}:</span> {imp.detail}
                      {imp.delay_days > 0 && <span className="ml-1 opacity-70">(+{imp.delay_days}d)</span>}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-zinc-500 text-center py-4">Run to compute MIS</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}