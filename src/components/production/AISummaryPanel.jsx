import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, Copy, Check, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function AISummaryPanel({ weekInfo, filteredProjectIds }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [stats, setStats] = useState(null);
  const [teamId, setTeamId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [posting, setPosting] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const result = await base44.functions.invoke('summarizeWeeklyNotes', {
        week_id: weekInfo.week_id,
        project_ids: filteredProjectIds
      });
      setSummary(result.data.summary);
      setStats(result.data.stats);
      toast.success('Summary generated');
    } catch (error) {
      toast.error('Failed to generate summary');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const postToTeams = async () => {
    if (!teamId || !channelId) {
      toast.error('Team ID and Channel ID required');
      return;
    }

    setPosting(true);
    try {
      // Convert markdown to HTML for Teams
      const htmlMessage = `
        <h2>Production Meeting Recap - ${weekInfo.display}</h2>
        <div>${summary.replace(/\n/g, '<br>')}</div>
        <p><em>Posted from Production Notes</em></p>
      `;

      await base44.functions.invoke('postToTeams', {
        team_id: teamId,
        channel_id: channelId,
        message: htmlMessage
      });

      toast.success('Posted to Teams');
      setOpen(false);
    } catch (error) {
      toast.error('Failed to post to Teams');
      console.error(error);
    } finally {
      setPosting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={() => !summary && generateSummary()}>
          <Sparkles size={14} className="mr-2" />
          AI Summary
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Weekly Summary - {weekInfo.display}</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin mr-2" />
            Generating summary...
          </div>
        )}

        {summary && (
          <div className="space-y-4">
            {/* Stats */}
            {stats && (
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{stats.total_notes} Total</Badge>
                <Badge variant="outline">{stats.decisions} Decisions</Badge>
                <Badge variant="outline">{stats.open_actions} Open Actions</Badge>
                {stats.blockers > 0 && (
                  <Badge className="bg-red-700">{stats.blockers} Blockers</Badge>
                )}
                {stats.risks > 0 && (
                  <Badge className="bg-amber-700">{stats.risks} Risks</Badge>
                )}
              </div>
            )}

            {/* Summary Content */}
            <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={copyToClipboard}>
                {copied ? <Check size={14} className="mr-2" /> : <Copy size={14} className="mr-2" />}
                Copy
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" onClick={generateSummary} disabled={loading}>
                  Regenerate
                </Button>
              </div>
            </div>

            {/* Teams Integration */}
            <div className="border-t pt-4 space-y-3">
              <div className="text-sm font-medium">Post to Microsoft Teams</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Team ID</Label>
                  <Input
                    placeholder="team-id-here"
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Channel ID</Label>
                  <Input
                    placeholder="channel-id-here"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <Button 
                onClick={postToTeams} 
                disabled={posting || !teamId || !channelId}
                className="w-full"
              >
                {posting ? (
                  <><Loader2 className="animate-spin mr-2" size={14} /> Posting...</>
                ) : (
                  <><Send size={14} className="mr-2" /> Post to Teams</>
                )}
              </Button>
              <div className="text-xs text-zinc-500">
                Find Team and Channel IDs in Teams URL or via Graph Explorer
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}