import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function TimeTracker({ task, currentUser, onLogTime }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    hours: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const timeLogs = task.time_logs || [];
  const totalLogged = timeLogs.reduce((sum, log) => sum + (log.hours || 0), 0);
  const estimated = task.estimated_hours || 0;
  const variance = totalLogged - estimated;
  const percentUsed = estimated > 0 ? (totalLogged / estimated * 100).toFixed(0) : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newLog = {
      user: currentUser?.email || 'unknown',
      date: formData.date,
      hours: parseFloat(formData.hours),
      description: formData.description,
      logged_at: new Date().toISOString()
    };

    const updatedLogs = [...timeLogs, newLog];
    const newTotal = updatedLogs.reduce((sum, log) => sum + (log.hours || 0), 0);

    onLogTime({
      time_logs: updatedLogs,
      actual_hours: newTotal
    });

    setFormData({
      hours: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setShowForm(false);
  };

  const handleDeleteLog = (index) => {
    const updatedLogs = timeLogs.filter((_, idx) => idx !== index);
    const newTotal = updatedLogs.reduce((sum, log) => sum + (log.hours || 0), 0);

    onLogTime({
      time_logs: updatedLogs,
      actual_hours: newTotal
    });
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock size={14} className="text-amber-500" />
            Time Tracking
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(!showForm)}
            className="text-xs"
          >
            <Plus size={12} className="mr-1" />
            Log Time
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">Hours Logged</span>
            <span className="text-lg font-bold text-white">{totalLogged}h</span>
          </div>
          {estimated > 0 && (
            <>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                <span>Estimated</span>
                <span>{estimated}h</span>
              </div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-zinc-400">Variance</span>
                <span className={variance > 0 ? 'text-red-400 font-medium' : 'text-green-400 font-medium'}>
                  {variance > 0 ? '+' : ''}{variance}h ({percentUsed}%)
                </span>
              </div>
              <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    percentUsed > 100 ? 'bg-red-500' : 
                    percentUsed > 80 ? 'bg-amber-500' : 
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(percentUsed, 100)}%` }}
                />
              </div>
            </>
          )}
        </div>

        {/* Log Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-4 p-3 bg-zinc-800 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Hours *</label>
                <Input
                  type="number"
                  step="0.25"
                  placeholder="8.0"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  className="bg-zinc-900 border-zinc-700"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Date *</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="bg-zinc-900 border-zinc-700"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Description</label>
              <Textarea
                placeholder="What was accomplished..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-zinc-900 border-zinc-700 text-sm"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                Log Time
              </Button>
            </div>
          </form>
        )}

        {/* Time Log List */}
        {timeLogs.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-zinc-400 font-medium mb-2">Time Entries</div>
            {timeLogs
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((log, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 bg-zinc-800/50 rounded text-xs"
                >
                  <Clock size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white">{log.hours}h</span>
                      <span className="text-zinc-500">{format(new Date(log.date), 'MMM d')}</span>
                    </div>
                    {log.description && (
                      <p className="text-zinc-400">{log.description}</p>
                    )}
                    <p className="text-zinc-600 mt-1">{log.user?.split('@')[0]}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteLog(index)}
                    className="p-1 text-zinc-600 hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
          </div>
        )}

        {timeLogs.length === 0 && !showForm && (
          <p className="text-xs text-zinc-500 text-center py-4">No time logged yet</p>
        )}
      </CardContent>
    </Card>
  );
}