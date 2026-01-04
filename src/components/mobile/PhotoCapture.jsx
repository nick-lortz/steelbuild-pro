import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Upload, MapPin, X, Check } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function PhotoCapture({ onPhotoCapture, entityType, entityId }) {
  const [mode, setMode] = useState(null); // 'camera' | 'upload'
  const [preview, setPreview] = useState(null);
  const [annotation, setAnnotation] = useState('');
  const [gpsLocation, setGpsLocation] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    },
    onSuccess: (url) => {
      onPhotoCapture?.({
        url,
        annotation,
        location: gpsLocation,
        entityType,
        entityId
      });
      resetCapture();
      toast.success('Photo uploaded');
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
      setPreview(URL.createObjectURL(blob));
      stopCamera();
    });
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      setMode('upload');
      getLocation();
    }
  };

  const savePhoto = () => {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      uploadMutation.mutate(file);
    });
  };

  const resetCapture = () => {
    setMode(null);
    setPreview(null);
    setAnnotation('');
    setGpsLocation(null);
    stopCamera();
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {!mode && !preview && (
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
                className="hidden"
              />
            </label>
          </div>
        )}

        {mode === 'camera' && !preview && (
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

        {preview && (
          <div className="space-y-3">
            <img src={preview} alt="Preview" className="w-full rounded-lg" />
            
            <Textarea
              placeholder="Add description or notes..."
              value={annotation}
              onChange={(e) => setAnnotation(e.target.value)}
              rows={3}
            />

            {gpsLocation && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-secondary rounded">
                <MapPin size={12} />
                <span>
                  {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                  {' '}(±{gpsLocation.accuracy.toFixed(0)}m)
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={savePhoto} disabled={uploadMutation.isPending} className="flex-1">
                <Check size={16} className="mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={resetCapture} className="flex-1">
                <X size={16} className="mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}