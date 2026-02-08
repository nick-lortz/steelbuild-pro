import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Check, X, Pencil } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function DrawingAnnotations({ drawingSetId, imageUrl }) {
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState(null);
  const [annotationText, setAnnotationText] = useState('');
  const imageRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.auth.me()
  });

  const { data: annotations = [] } = useQuery({
    queryKey: ['annotations', drawingSetId],
    queryFn: () => apiClient.entities.DrawingAnnotation.filter({ drawing_set_id: drawingSetId }),
    enabled: !!drawingSetId
  });

  const createAnnotationMutation = useMutation({
    mutationFn: (data) => apiClient.entities.DrawingAnnotation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['annotations']);
      setNewAnnotation(null);
      setAnnotationText('');
      setIsAnnotating(false);
      toast.success('Annotation added');
    }
  });

  const resolveAnnotationMutation = useMutation({
    mutationFn: ({ id }) => apiClient.entities.DrawingAnnotation.update(id, {
      is_resolved: true,
      resolved_by: currentUser?.email,
      resolved_date: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['annotations']);
      toast.success('Annotation resolved');
    }
  });

  const handleImageClick = (e) => {
    if (!isAnnotating || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setNewAnnotation({ x, y });
  };

  const saveAnnotation = () => {
    if (!annotationText.trim() || !newAnnotation) return;

    createAnnotationMutation.mutate({
      drawing_set_id: drawingSetId,
      x_position: newAnnotation.x,
      y_position: newAnnotation.y,
      content: annotationText,
      author_email: currentUser?.email,
      author_name: currentUser?.full_name || currentUser?.email,
      annotation_type: 'comment'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant={isAnnotating ? "default" : "outline"}
          onClick={() => {
            setIsAnnotating(!isAnnotating);
            setNewAnnotation(null);
            setAnnotationText('');
          }}
        >
          <Pencil size={16} className="mr-2" />
          {isAnnotating ? 'Annotating...' : 'Add Annotation'}
        </Button>
        <Badge variant="outline">{annotations.filter(a => !a.is_resolved).length} active</Badge>
      </div>

      <div className="relative border rounded-lg overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Drawing"
            onClick={handleImageClick}
            className={`w-full ${isAnnotating ? 'cursor-crosshair' : 'cursor-default'}`}
          />
        ) : (
          <div className="aspect-video flex items-center justify-center text-muted-foreground">
            No drawing preview available
          </div>
        )}

        {/* Existing Annotations */}
        {annotations.filter(a => !a.is_resolved).map((annotation) => (
          <div
            key={annotation.id}
            className="absolute w-8 h-8 -ml-4 -mt-4 group"
            style={{
              left: `${annotation.x_position}%`,
              top: `${annotation.y_position}%`
            }}
          >
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center cursor-pointer shadow-lg">
              <MessageSquare size={16} className="text-black" />
            </div>
            <div className="absolute top-10 left-0 w-64 bg-popover border rounded-lg p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <p className="text-xs font-medium mb-1">{annotation.author_name}</p>
              <p className="text-xs mb-2">{annotation.content}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => resolveAnnotationMutation.mutate({ id: annotation.id })}
                className="pointer-events-auto"
              >
                <Check size={12} className="mr-1" />
                Resolve
              </Button>
            </div>
          </div>
        ))}

        {/* New Annotation Being Placed */}
        {newAnnotation && (
          <div
            className="absolute w-8 h-8 -ml-4 -mt-4"
            style={{
              left: `${newAnnotation.x}%`,
              top: `${newAnnotation.y}%`
            }}
          >
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
              <MessageSquare size={16} className="text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Annotation Input */}
      {newAnnotation && (
        <div className="flex gap-2">
          <Input
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            placeholder="Enter annotation text..."
            className="flex-1"
            autoFocus
          />
          <Button onClick={saveAnnotation} disabled={!annotationText.trim()}>
            <Check size={16} />
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setNewAnnotation(null);
              setAnnotationText('');
            }}
          >
            <X size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}