import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Camera, X, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SafetyReportForm({ projectId, user }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [formData, setFormData] = useState({
    type: 'observation',
    severity: 'low',
    location: '',
    description: '',
    corrective_action: '',
    person_involved: ''
  });

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const createSafetyReportMutation = useMutation({
    mutationFn: async ({ data, photos }) => {
      // Upload photos first
      const photoUrls = [];
      for (const file of photos) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        photoUrls.push(file_url);
      }

      // Create FieldIssue for safety observation/incident
      return await base44.entities.FieldIssue.create({
        project_id: projectId,
        issue_type: data.type === 'incident' ? 'safety' : 'observation',
        severity: data.severity,
        location: data.location,
        description: data.description,
        status: 'open',
        reported_by: user?.email || 'unknown',
        reported_date: new Date().toISOString(),
        corrective_action_taken: data.corrective_action || null,
        person_involved: data.person_involved || null,
        photos: photoUrls.map(url => ({
          file_url: url,
          uploaded_by: user?.email,
          uploaded_date: new Date().toISOString()
        }))
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fieldIssues', projectId]);
      toast.success('Safety report submitted');
      setSelectedFiles([]);
      setFormData({
        type: 'observation',
        severity: 'low',
        location: '',
        description: '',
        corrective_action: '',
        person_involved: ''
      });
    },
    onError: (error) => {
      toast.error('Failed to submit safety report');
      console.error(error);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description || !formData.location) {
      toast.error('Description and location are required');
      return;
    }

    setUploading(true);
    try {
      await createSafetyReportMutation.mutateAsync({ 
        data: formData, 
        photos: selectedFiles 
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Alert Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-200">
          <p className="font-semibold mb-1">Report Safety Issues Immediately</p>
          <p className="text-amber-300/80">
            For emergencies, call 911 first. This form is for documentation.
          </p>
        </div>
      </div>

      <Card className="bg-[#0A0A0A] border-[rgba(255,255,255,0.05)] p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type */}
          <div>
            <Label className="text-[#E5E7EB] mb-2">Report Type</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
              <SelectTrigger className="bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="observation">Safety Observation</SelectItem>
                <SelectItem value="near_miss">Near Miss</SelectItem>
                <SelectItem value="incident">Incident</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Severity */}
          <div>
            <Label className="text-[#E5E7EB] mb-2">Severity</Label>
            <Select value={formData.severity} onValueChange={(v) => setFormData({ ...formData, severity: v })}>
              <SelectTrigger className="bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Minor hazard</SelectItem>
                <SelectItem value="medium">Medium - Requires attention</SelectItem>
                <SelectItem value="high">High - Serious hazard</SelectItem>
                <SelectItem value="critical">Critical - Immediate danger</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div>
            <Label className="text-[#E5E7EB] mb-2">Location *</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Grid B4, Level 3 east side"
              className="bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB]"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-[#E5E7EB] mb-2">Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what you observed or what happened..."
              rows={4}
              className="bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB] resize-none"
            />
          </div>

          {/* Person Involved */}
          {formData.type !== 'observation' && (
            <div>
              <Label className="text-[#E5E7EB] mb-2">Person(s) Involved</Label>
              <Input
                value={formData.person_involved}
                onChange={(e) => setFormData({ ...formData, person_involved: e.target.value })}
                placeholder="Name or crew identification"
                className="bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB]"
              />
            </div>
          )}

          {/* Corrective Action */}
          <div>
            <Label className="text-[#E5E7EB] mb-2">Corrective Action Taken</Label>
            <Textarea
              value={formData.corrective_action}
              onChange={(e) => setFormData({ ...formData, corrective_action: e.target.value })}
              placeholder="What was done to address the issue..."
              rows={3}
              className="bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB] resize-none"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <Label className="text-[#E5E7EB] mb-2">Attach Photos</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full h-16 border-dashed"
            >
              <Camera className="w-5 h-5 mr-2" />
              Add Photos ({selectedFiles.length})
            </Button>

            {selectedFiles.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative bg-black border border-[rgba(255,255,255,0.1)] rounded-lg p-2">
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                    <div className="text-xs text-[#9CA3AF] truncate">{file.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold bg-amber-600 hover:bg-amber-700"
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Submit Safety Report
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}