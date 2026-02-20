import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Upload, X, MapPin, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PhotoUploadPanel({ projectId, user }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [formData, setFormData] = useState({
    task_id: '',
    area: '',
    description: '',
    tags: ''
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      return await base44.entities.Task.filter({ 
        project_id: projectId,
        status: { $in: ['in_progress', 'not_started', 'completed'] }
      });
    }
  });

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + selectedFiles.length > 5) {
      toast.error('Maximum 5 files at a time');
      return;
    }
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const uploadPhotosMutation = useMutation({
    mutationFn: async ({ files, metadata }) => {
      const uploadedUrls = [];
      
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }

      // Create a project photo record (reusing existing ProjectPhotos approach)
      // Or extend Task attachments
      if (metadata.task_id) {
        const task = await base44.entities.Task.filter({ id: metadata.task_id });
        if (task[0]) {
          const existingAttachments = task[0].attachments || [];
          const newAttachments = uploadedUrls.map(url => ({
            file_url: url,
            file_name: 'Field Photo',
            file_type: 'image',
            uploaded_by: user?.email,
            uploaded_date: new Date().toISOString(),
            description: metadata.description,
            area: metadata.area,
            tags: metadata.tags ? metadata.tags.split(',').map(t => t.trim()) : []
          }));
          
          await base44.entities.Task.update(metadata.task_id, {
            attachments: [...existingAttachments, ...newAttachments]
          });
        }
      }
      
      return uploadedUrls;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks', projectId]);
      toast.success('Photos uploaded successfully');
      setSelectedFiles([]);
      setFormData({ task_id: '', area: '', description: '', tags: '' });
    },
    onError: (error) => {
      toast.error('Failed to upload photos');
      console.error(error);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one photo');
      return;
    }
    
    setUploading(true);
    try {
      await uploadPhotosMutation.mutateAsync({ 
        files: selectedFiles, 
        metadata: formData 
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-[#0A0A0A] border-[rgba(255,255,255,0.05)] p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Camera Capture */}
          <div className="text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              capture="environment"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              onClick={handleCapture}
              variant="outline"
              className="w-full h-24 border-2 border-dashed border-[rgba(255,157,66,0.3)] hover:border-[rgba(255,157,66,0.6)] bg-[rgba(255,157,66,0.05)]"
            >
              <div className="flex flex-col items-center gap-2">
                <Camera className="w-8 h-8 text-[#FF9D42]" />
                <span className="text-[#E5E7EB] font-medium">Capture Photo/Video</span>
                <span className="text-xs text-[#6B7280]">or select from gallery</span>
              </div>
            </Button>
          </div>

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[#E5E7EB]">Selected Files ({selectedFiles.length})</Label>
              <div className="grid grid-cols-2 gap-2">
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
                    <div className="text-[10px] text-[#6B7280]">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link to Task */}
          <div>
            <Label className="text-[#E5E7EB] mb-2">Link to Task (Optional)</Label>
            <Select value={formData.task_id} onValueChange={(v) => setFormData({ ...formData, task_id: v })}>
              <SelectTrigger className="bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB]">
                <SelectValue placeholder="Select task..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>No task</SelectItem>
                {tasks?.map(task => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Area/Location */}
          <div>
            <Label className="text-[#E5E7EB] mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Area/Location
            </Label>
            <Input
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              placeholder="Grid A3-A6, Level 2"
              className="bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB]"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-[#E5E7EB] mb-2">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Column erection progress, bolts torqued..."
              rows={3}
              className="bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB] resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <Label className="text-[#E5E7EB] mb-2">Tags (comma separated)</Label>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="erection, progress, columns"
              className="bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB]"
            />
          </div>

          {/* Submit */}
          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold"
            disabled={uploading || selectedFiles.length === 0}
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Upload {selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'}
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}