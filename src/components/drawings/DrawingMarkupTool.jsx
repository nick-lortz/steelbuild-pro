import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Pencil, Type, Square, Circle, ArrowRight, Pin, Save, X, 
  Eye, EyeOff, Layers, Trash2, Undo, Download 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const TOOLS = [
  { id: 'freehand', icon: Pencil, label: 'Freehand' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { id: 'pin', icon: Pin, label: 'Pin' }
];

const COLORS = [
  { value: '#EF4444', label: 'Red' },
  { value: '#F59E0B', label: 'Orange' },
  { value: '#10B981', label: 'Green' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#000000', label: 'Black' }
];

export default function DrawingMarkupTool({ sheetId, imageUrl, linkedRfiId = null }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('freehand');
  const [color, setColor] = useState('#EF4444');
  const [lineWidth, setLineWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [textPosition, setTextPosition] = useState(null);
  const [layerName, setLayerName] = useState('General');
  const [history, setHistory] = useState([]);
  const queryClient = useQueryClient();

  const { data: annotations = [] } = useQuery({
    queryKey: ['annotations', sheetId, layerName],
    queryFn: () => base44.entities.DrawingAnnotation.filter({
      drawing_sheet_id: sheetId,
      layer_name: layerName
    }),
    enabled: !!sheetId
  });

  const { data: layers = [] } = useQuery({
    queryKey: ['annotation-layers', sheetId],
    queryFn: async () => {
      const all = await base44.entities.DrawingAnnotation.filter({ drawing_sheet_id: sheetId });
      const unique = [...new Set(all.map(a => a.layer_name))];
      return unique;
    },
    enabled: !!sheetId
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.DrawingAnnotation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations', sheetId] });
      queryClient.invalidateQueries({ queryKey: ['annotation-layers', sheetId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DrawingAnnotation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations', sheetId] });
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      redrawAnnotations();
    };
  }, [imageUrl, annotations]);

  const redrawAnnotations = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      annotations.filter(a => a.is_visible).forEach(annotation => {
        const geometry = JSON.parse(annotation.geometry || '{}');
        const style = JSON.parse(annotation.style || '{}');
        
        ctx.strokeStyle = style.color || '#EF4444';
        ctx.lineWidth = style.lineWidth || 2;
        ctx.fillStyle = style.color || '#EF4444';

        if (annotation.annotation_type === 'freehand') {
          ctx.beginPath();
          geometry.points.forEach((point, i) => {
            if (i === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          });
          ctx.stroke();
        } else if (annotation.annotation_type === 'rectangle') {
          ctx.strokeRect(geometry.x, geometry.y, geometry.width, geometry.height);
        } else if (annotation.annotation_type === 'circle') {
          ctx.beginPath();
          ctx.arc(geometry.x, geometry.y, geometry.radius, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (annotation.annotation_type === 'text') {
          ctx.font = `${style.fontSize || 16}px Arial`;
          ctx.fillText(annotation.content, geometry.x, geometry.y);
        } else if (annotation.annotation_type === 'pin') {
          ctx.beginPath();
          ctx.arc(geometry.x, geometry.y, 8, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = '#FFF';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(annotation.content?.substring(0, 1) || 'P', geometry.x, geometry.y + 4);
        }
      });
    };
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    
    if (tool === 'text' || tool === 'pin') {
      setTextPosition(pos);
      setShowTextDialog(true);
      return;
    }

    setIsDrawing(true);
    setCurrentPath([pos]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);
    setCurrentPath(prev => [...prev, pos]);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (currentPath.length < 2) return;

    let geometry = {};
    
    if (tool === 'freehand') {
      geometry = { points: currentPath };
    } else if (tool === 'rectangle') {
      const minX = Math.min(...currentPath.map(p => p.x));
      const maxX = Math.max(...currentPath.map(p => p.x));
      const minY = Math.min(...currentPath.map(p => p.y));
      const maxY = Math.max(...currentPath.map(p => p.y));
      geometry = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    } else if (tool === 'circle') {
      const start = currentPath[0];
      const end = currentPath[currentPath.length - 1];
      const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      geometry = { x: start.x, y: start.y, radius };
    }

    saveMutation.mutate({
      drawing_sheet_id: sheetId,
      layer_name: layerName,
      annotation_type: tool,
      geometry: JSON.stringify(geometry),
      style: JSON.stringify({ color, lineWidth }),
      linked_rfi_id: linkedRfiId,
      is_visible: true
    });

    setCurrentPath([]);
  };

  const handleTextSave = () => {
    if (!textInput || !textPosition) return;

    saveMutation.mutate({
      drawing_sheet_id: sheetId,
      layer_name: layerName,
      annotation_type: tool,
      geometry: JSON.stringify(textPosition),
      content: textInput,
      style: JSON.stringify({ color, fontSize: 16 }),
      linked_rfi_id: linkedRfiId,
      is_visible: true
    });

    setTextInput('');
    setTextPosition(null);
    setShowTextDialog(false);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Tools */}
            <div className="flex items-center gap-2">
              {TOOLS.map(({ id, icon: Icon, label }) => (
                <Button
                  key={id}
                  size="sm"
                  variant={tool === id ? 'default' : 'outline'}
                  onClick={() => setTool(id)}
                  title={label}
                >
                  <Icon size={16} />
                </Button>
              ))}
            </div>

            {/* Color */}
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLORS.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: c.value }} />
                      {c.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Line Width */}
            <Input
              type="number"
              min="1"
              max="10"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-20"
            />

            {/* Layer */}
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-zinc-500" />
              <Input
                value={layerName}
                onChange={(e) => setLayerName(e.target.value)}
                placeholder="Layer name"
                className="w-32"
              />
            </div>

            <Button size="sm" variant="outline" onClick={redrawAnnotations}>
              <Undo size={16} className="mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Canvas */}
      <Card>
        <CardContent className="p-0">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="w-full cursor-crosshair"
          />
        </CardContent>
      </Card>

      {/* Text Dialog */}
      {showTextDialog && (
        <Card className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-96">
          <CardContent className="p-4 space-y-4">
            <h3 className="font-bold">Add {tool === 'pin' ? 'Pin Note' : 'Text'}</h3>
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter text..."
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowTextDialog(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleTextSave}>
                <Save size={16} className="mr-2" />
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Layers List */}
      {layers.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-bold mb-2">Layers</h4>
            <div className="space-y-1">
              {layers.map(layer => (
                <div key={layer} className="flex items-center justify-between p-2 rounded bg-zinc-900/50">
                  <Badge variant="outline">{layer}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setLayerName(layer)}
                  >
                    Select
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}