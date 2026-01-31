import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Link2, CheckCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function DocumentLinkSuggestions({ document, suggestions, onLink, onDismiss }) {
  const [expanded, setExpanded] = useState(true);

  if (!suggestions || (!suggestions.tasks?.length && !suggestions.work_packages?.length && !suggestions.rfis?.length)) {
    return null;
  }

  const confidenceColor = suggestions.confidence >= 0.8 ? 'text-green-400' :
                          suggestions.confidence >= 0.5 ? 'text-amber-400' : 'text-red-400';

  return (
    <Card className="bg-blue-500/10 border-blue-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-blue-400">
            <Sparkles size={14} />
            AI-Suggested Links
            <Badge className={`${confidenceColor} border-current text-[10px]`}>
              {(suggestions.confidence * 100).toFixed(0)}% confidence
            </Badge>
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
            className="h-6 w-6 p-0 text-zinc-400"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3 pt-0">
          {/* Tasks */}
          {suggestions.tasks?.length > 0 && (
            <div>
              <p className="text-xs text-zinc-400 mb-2 font-bold uppercase">Tasks</p>
              <div className="space-y-1.5">
                {suggestions.tasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-2 bg-zinc-900 rounded border border-zinc-800">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{task.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">
                          Task
                        </Badge>
                        <span className="text-[10px] text-zinc-500">
                          Match: {task.match_score}%
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        size="sm"
                        onClick={() => onLink('task', task.id)}
                        className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white text-xs"
                      >
                        <Link2 size={12} className="mr-1" />
                        Link
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Work Packages */}
          {suggestions.work_packages?.length > 0 && (
            <div>
              <p className="text-xs text-zinc-400 mb-2 font-bold uppercase">Work Packages</p>
              <div className="space-y-1.5">
                {suggestions.work_packages.map(wp => (
                  <div key={wp.id} className="flex items-center justify-between p-2 bg-zinc-900 rounded border border-zinc-800">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{wp.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">
                          Work Package
                        </Badge>
                        <span className="text-[10px] text-zinc-500">
                          Match: {wp.match_score}%
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        size="sm"
                        onClick={() => onLink('work_package', wp.id)}
                        className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white text-xs"
                      >
                        <Link2 size={12} className="mr-1" />
                        Link
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RFIs */}
          {suggestions.rfis?.length > 0 && (
            <div>
              <p className="text-xs text-zinc-400 mb-2 font-bold uppercase">RFIs</p>
              <div className="space-y-1.5">
                {suggestions.rfis.map(rfi => (
                  <div key={rfi.id} className="flex items-center justify-between p-2 bg-zinc-900 rounded border border-zinc-800">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">RFI #{rfi.rfi_number} - {rfi.subject}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">
                          RFI
                        </Badge>
                        <span className="text-[10px] text-zinc-500">
                          Match: {rfi.match_score}%
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        size="sm"
                        onClick={() => onLink('rfi', rfi.id)}
                        className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white text-xs"
                      >
                        <Link2 size={12} className="mr-1" />
                        Link
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="w-full text-xs text-zinc-400 hover:text-white"
          >
            <X size={12} className="mr-1" />
            Dismiss Suggestions
          </Button>
        </CardContent>
      )}
    </Card>
  );
}