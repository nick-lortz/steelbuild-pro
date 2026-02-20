import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Users, Cloud, Thermometer, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function DailyReportForm({ projectId, user }) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    date: today,
    crew_size: '',
    hours_worked: '',
    weather: 'clear',
    temperature: '',
    work_completed: '',
    delays: '',
    equipment_used: '',
    materials_received: '',
    notes: ''
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      return await base44.entities.Task.filter({ 
        project_id: projectId,
        status: { $in: ['in_progress', 'not_started'] }
      });
    }
  });

  const createLogMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.DailyLog.create({
        project_id: projectId,
        date: data.date,
        crew_size: parseInt(data.crew_size),
        hours_worked: parseFloat(data.hours_worked),
        weather: data.weather,
        temperature: data.temperature ? parseInt(data.temperature) : null,
        work_completed: data.work_completed,
        delays: data.delays || null,
        equipment_used: data.equipment_used || null,
        materials_received: data.materials_received || null,
        notes: data.notes || null,
        submitted_by: user?.email || 'unknown'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dailyLogs', projectId]);
      toast.success('Daily log submitted successfully');
      setFormData({
        date: today,
        crew_size: '',
        hours_worked: '',
        weather: 'clear',
        temperature: '',
        work_completed: '',
        delays: '',
        equipment_used: '',
        materials_received: '',
        notes: ''
      });
    },
    onError: (error) => {
      toast.error('Failed to submit daily log');
      console.error(error);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.crew_size || !formData.work_completed) {
      toast.error('Crew size and work completed are required');
      return;
    }
    createLogMutation.mutate(formData);
  };

  const weatherOptions = [
    { value: 'clear', label: 'Clear', icon: '☀️' },
    { value: 'cloudy', label: 'Cloudy', icon: '☁️' },
    { value: 'rain', label: 'Rain', icon: '🌧️' },
    { value: 'snow', label: 'Snow', icon: '❄️' },
    { value: 'wind', label: 'Windy', icon: '💨' }
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-[#0A0A0A] border-[rgba(255,255,255,0.05)] p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date */}
          <div>
            <Label className="text-[#E5E7EB] mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Date
            </Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB]"
            />
          </div>

          {/* Crew & Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#E5E7EB] mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Crew Size *
              </Label>
              <Input
                type="number"
                min="1"
                value={formData.crew_size}
                onChange={(e) => setFormData({ ...formData, crew_size: e.target.value })}
                placeholder="8"
                className="bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB]"
              />
            </div>
            <div>
              <Label className="text-[#E5E7EB] mb-2">Total Hours</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.hours_worked}
                onChange={(e) => setFormData({ ...formData, hours_worked: e.target.value })}
                placeholder="64"
                className="bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB]"
              />
            </div>
          </div>

          {/* Weather */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#E5E7EB] mb-2 flex items-center gap-2">
                <Cloud className="w-4 h-4" />
                Weather
              </Label>
              <Select value={formData.weather} onValueChange={(v) => setFormData({ ...formData, weather: v })}>
                <SelectTrigger className="bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weatherOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#E5E7EB] mb-2 flex items-center gap-2">
                <Thermometer className="w-4 h-4" />
                Temp (°F)
              </Label>
              <Input
                type="number"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                placeholder="72"
                className="bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB]"
              />
            </div>
          </div>

          {/* Work Completed */}
          <div>
            <Label className="text-[#E5E7EB] mb-2">Work Completed Today *</Label>
            <Textarea
              value={formData.work_completed}
              onChange={(e) => setFormData({ ...formData, work_completed: e.target.value })}
              placeholder="Erected columns C1-C8 on Grid A. Completed bolt-up on Level 2 east wing. Set 12 beams."
              rows={4}
              className="bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB] resize-none"
            />
          </div>

          {/* Equipment Used */}
          <div>
            <Label className="text-[#E5E7EB] mb-2">Equipment Used</Label>
            <Input
              value={formData.equipment_used}
              onChange={(e) => setFormData({ ...formData, equipment_used: e.target.value })}
              placeholder="150T crane, 2x forklifts, welding truck"
              className="bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB]"
            />
          </div>

          {/* Materials Received */}
          <div>
            <Label className="text-[#E5E7EB] mb-2">Materials Received</Label>
            <Input
              value={formData.materials_received}
              onChange={(e) => setFormData({ ...formData, materials_received: e.target.value })}
              placeholder="18 tons, Bundle #47-52"
              className="bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB]"
            />
          </div>

          {/* Delays */}
          <div>
            <Label className="text-[#E5E7EB] mb-2">Delays or Issues</Label>
            <Textarea
              value={formData.delays}
              onChange={(e) => setFormData({ ...formData, delays: e.target.value })}
              placeholder="30 min delay due to crane inspection"
              rows={3}
              className="bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB] resize-none"
            />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-[#E5E7EB] mb-2">Additional Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any other relevant information..."
              rows={3}
              className="bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB] resize-none"
            />
          </div>

          {/* Submit */}
          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold"
            disabled={createLogMutation.isPending}
          >
            {createLogMutation.isPending ? (
              'Submitting...'
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Submit Daily Log
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}