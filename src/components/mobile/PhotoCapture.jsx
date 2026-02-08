import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Upload, MapPin, X, Check } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function PhotoCapture({ onPhotoCapture, entityType, entityId, projectId, allowMultiple = true }) {
  const [mode, setMode] = useState(null); // 'camera' | 'upload'
  const [previews, setPreviews] = useState([]); // Array of {preview, file, annotation}
  const [currentAnnotation, setCurrentAnnotation] = useState('');
  const [gpsLocation, setGpsLocation] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await apiClient.integrations.Core.UploadFile({ file });
      
      // Auto-create Document record if projectId provided
      if (projectId) {
        await apiClient.entities.Document.create({
          project_id: projectId,
          title: file.name || `Photo - ${new Date().toLocaleDateString()}`,
          description: currentAnnotation,
          category: 'photo',
          file_url,
          file_name: file.name,
          status: 'issued'
        }).catch(() => null); // Silent fail if document creation fails
      }
      
      return file_url;
    },
    onSuccess: (url) => {
      const photo = {
        url,
        annotation: currentAnnotation,
        location: gpsLocation,
        entityType,
        entityId
      };
      
      onPhotoCapture?.(photo);
      
      if (allowMultiple) {
        setPreviews(prev => prev.filter(p => p.preview !== previews[previews.length - 1]?.preview));
        setCurrentAnnotation('');
        toast.success('Photo uploaded');
      } else {
        resetCapture();
        toast.success('Photo uploaded');
      }
    }
  });

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          toast.success('Location captured');
        },
        () => toast.error('Location access denied')
      );
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMode('camera');
      getLocation();
    } catch (error) {
      toast.error('Camera access denied');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      const preview = URL.createObjectURL(blob);
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      if (allowMultiple) {
        setPreviews(prev => [...prev, { preview, file, annotation: '' }]);
      } else {
        setPreviews([{ preview, file, annotation: '' }]);
      }
      
      stopCamera();
      setMode(null);
    });
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    if (allowMultiple) {
      files.forEach(file => {
        const preview = URL.createObjectURL(file);
        setPreviews(prev => [...prev, { preview, file, annotation: '' }]);
      });
      getLocation();
    } else {
      setMode('upload');
      setPreviews([{ preview: URL.createObjectURL(files[0]), file: files[0], annotation: '' }]);
      getLocation();
    }
  };

  const savePhoto = (index) => {
    const item = previews[index];
    setCurrentAnnotation(item.annotation);
    uploadMutation.mutate(item.file);
  };

  const removePhoto = (index) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const resetCapture = () => {
    setMode(null);
    setPreviews([]);
    setCurrentAnnotation('');
    setGpsLocation(null);
    stopCamera();
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {previews.length === 0 && !mode && (
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={startCamera} className="h-24">
              <Camera size={24} />
            </Button>
            <label>
              <Button asChild className="h-24 w-full">
                <span>
                  <Upload size={24} />
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                multiple={allowMultiple}
                className="hidden"
              />
            </label>
          </div>
        )}

        {mode === 'camera' && (
          <div className="space-y-3">
            <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
            <Button onClick={capturePhoto} className="w-full">
              <Camera size={16} className="mr-2" />
              Capture
            </Button>
            <Button variant="outline" onClick={resetCapture} className="w-full">
              Cancel
            </Button>
          </div>
        )}

        {previews.length > 0 && (
          <div className="space-y-3">
            {previews.map((item, index) => (
              <div key={index} className="space-y-2 p-3 bg-zinc-800 rounded-lg">
                <div className="relative">
                  <img src={item.preview} alt={`Preview ${index + 1}`} className="w-full rounded-lg" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <Textarea
                  placeholder="Add description or notes..."
                  value={item.annotation}
                  onChange={(e) => {
                    const newPreviews = [...previews];
                    newPreviews[index].annotation = e.target.value;
                    setPreviews(newPreviews);
                  }}
                  rows={2}
                  className="text-xs"
                />

                {gpsLocation && (
                  <div className="flex items-center gap-2 text-xs text-zinc-400 p-2 bg-zinc-900 rounded">
                    <MapPin size={12} />
                    <span>
                      {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                    </span>
                  </div>
                )}

                <Button 
                  onClick={() => savePhoto(index)} 
                  disabled={uploadMutation.isPending} 
                  size="sm"
                  className="w-full"
                >
                  <Check size={14} className="mr-1" />
                  Upload
                </Button>
              </div>
            ))}

            {allowMultiple && (
              <Button variant="outline" onClick={() => setPreviews([])} className="w-full text-xs">
                Clear All
              </Button>
            )}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}