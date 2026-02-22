import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function TransitionHealthPanel({ entity, entityType = 'Entity' }) {
  if (!entity) return null;

  const isBlocked = entity.last_transition_blocked === true;
  const attemptAt = entity.last_transition_attempt_at ? new Date(entity.last_transition_attempt_at).toLocaleString() : null;
  const attemptBy = entity.last_transition_attempt_by;

  return (
    <Card className={`border ${isBlocked ? 'border-red-900/30 bg-red-950/20' : 'border-green-900/30 bg-green-950/20'}`}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          {isBlocked ? (
            <AlertCircle className="w-4 h-4 text-red-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          )}
          Transition Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!isBlocked ? (
          <p className="text-xs text-green-300">
            ✓ Ready for status transitions
          </p>
        ) : (
          <div className="space-y-2">
            <div className="text-xs">
              <span className="text-gray-400">Last Attempt:</span>
              <span className="text-gray-300 ml-2">{attemptAt || '—'}</span>
            </div>

            {attemptBy && (
              <div className="text-xs">
                <span className="text-gray-400">Attempted By:</span>
                <span className="text-gray-300 ml-2">{attemptBy}</span>
              </div>
            )}

            {entity.last_transition_block_reasons && entity.last_transition_block_reasons.length > 0 && (
              <div>
                <div className="text-xs text-red-300 mb-1">Blocked Because:</div>
                <ul className="space-y-1">
                  {entity.last_transition_block_reasons.map((reason, idx) => (
                    <li key={idx} className="text-xs text-red-300 ml-3">
                      • {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}