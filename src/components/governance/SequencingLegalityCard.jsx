import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SequencingLegalityCard({ delivery, workPackages = [] }) {
  if (!delivery) return null;

  const isValid = delivery.sequencing_valid === true;
  const isInstallable = delivery.is_installable_delivery === true;

  return (
    <Card className={`border ${isValid ? 'border-green-900/30 bg-green-950/20' : 'border-red-900/30 bg-red-950/20'}`}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          {isValid ? (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          Sequencing Legality
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Validity status */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Sequencing Valid:</span>
          <Badge className={isValid ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}>
            {isValid ? 'YES' : 'NO'}
          </Badge>
        </div>

        {/* Installable status */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Installable:</span>
          <Badge className={isInstallable ? 'bg-green-900 text-green-200' : 'bg-amber-900 text-amber-200'}>
            {isInstallable ? 'YES' : 'NO'}
          </Badge>
        </div>

        {/* Blocking reasons */}
        {!isValid && delivery.sequencing_block_reasons && delivery.sequencing_block_reasons.length > 0 && (
          <div className="pt-2 border-t border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Blocking Reasons:</div>
            <ul className="space-y-1">
              {delivery.sequencing_block_reasons.map((reason, idx) => (
                <li key={idx} className="text-xs text-red-300 leading-relaxed">
                  • {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Installable reasons */}
        {isValid && !isInstallable && delivery.installable_reasons && delivery.installable_reasons.length > 0 && (
          <div className="pt-2 border-t border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Not Installable Because:</div>
            <ul className="space-y-1">
              {delivery.installable_reasons.map((reason, idx) => (
                <li key={idx} className="text-xs text-amber-300 leading-relaxed">
                  • {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* WP summary */}
        {workPackages.length > 0 && (
          <div className="pt-2 border-t border-gray-700 text-xs text-gray-400">
            <span>{workPackages.length} WP(s)</span>
            {workPackages.some(wp => !wp.install_ready) && (
              <span className="ml-2 text-red-300">
                ({workPackages.filter(wp => !wp.install_ready).length} not install-ready)
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}