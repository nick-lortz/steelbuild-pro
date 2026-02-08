import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Pencil, Square, Circle, Eraser, Download, 
  X, Pin, MessageSquare, Undo, Redo, Save
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TOOLS = {
  PENCIL: 'pencil',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  TEXT: 'text',
  PIN: 'pin',
  ERASER: 'eraser'
};

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#000000', '#ffffff'];

export default function DrawingMarkup({ 
  imageUrl, 
  existingAnnotations = [],
  onSave,
  readOnly = false 
}) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [tool, setTool] = useState(TOOLS.PENCIL);
  const [color, setColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [annotations, setAnnotations] = useState(existingAnnotations);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [pins, setPins] = useState([]);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [activePinPos, setActivePinPos] = useState(null);
  const [pinComment, setPinComment] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      setImageLoaded(true);
      redrawAnnotations();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const redrawAnnotations = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear and redraw base image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Redraw all annotations
      annotations.forEach(annotation => {
        ctx.strokeStyle = annotation.color;
        ctx.lineWidth = annotation.lineWidth;
        ctx.fillStyle = annotation.color;

        switch (annotation.type) {
          case TOOLS.PENCIL:
            ctx.beginPath();
            annotation.points.forEach((point, idx) => {
              if (idx === 0) ctx.moveTo(point.x, point.y);
              else ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
            break;
          case TOOLS.RECTANGLE:
            ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
            break;
          case TOOLS.CIRCLE:
            ctx.beginPath();
            const radius = Math.sqrt(annotation.width ** 2 + annotation.height ** 2);
            ctx.arc(annotation.x, annotation.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
            break;
          case TOOLS.TEXT:
            ctx.font = `${annotation.fontSize || 16}px Arial`;
            ctx.fillText(annotation.text, annotation.x, annotation.y);
            break;
        }
      });
    };
    img.src = imageUrl;
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    if (readOnly) return;
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPos(pos);

    if (tool === TOOLS.PENCIL) {
      const newAnnotation = {
        type: TOOLS.PENCIL,
        points: [pos],
        color,
        lineWidth
      };
      setAnnotations([...annotations, newAnnotation]);
    } else if (tool === TOOLS.PIN) {
      setActivePinPos(pos);
      setShowPinDialog(true);
      setIsDrawing(false);
    }
  };

  const draw = (e) => {
    if (!isDrawing || !startPos || readOnly) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getMousePos(e);

    if (tool === TOOLS.PENCIL) {
      const currentAnnotation = annotations[annotations.length - 1];
      currentAnnotation.points.push(pos);
      setAnnotations([...annotations]);
      
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setStartPos(pos);
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing || readOnly) return;
    const pos = getMousePos(e);

    if (tool === TOOLS.RECTANGLE) {
      const newAnnotation = {
        type: TOOLS.RECTANGLE,
        x: startPos.x,
        y: startPos.y,
        width: pos.x - startPos.x,
        height: pos.y - startPos.y,
        color,
        lineWidth
      };
      setAnnotations([...annotations, newAnnotation]);
      addToHistory([...annotations, newAnnotation]);
      redrawAnnotations();
    } else if (tool === TOOLS.CIRCLE) {
      const newAnnotation = {
        type: TOOLS.CIRCLE,
        x: startPos.x,
        y: startPos.y,
        width: pos.x - startPos.x,
        height: pos.y - startPos.y,
        color,
        lineWidth
      };
      setAnnotations([...annotations, newAnnotation]);
      addToHistory([...annotations, newAnnotation]);
      redrawAnnotations();
    } else if (tool === TOOLS.PENCIL) {
      addToHistory(annotations);
    }

    setIsDrawing(false);
    setStartPos(null);
  };

  const addToHistory = (newAnnotations) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
      redrawAnnotations();
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
      redrawAnnotations();
    }
  };

  const savePin = () => {
    if (!pinComment.trim() || !activePinPos) return;
    
    const newPin = {
      id: Date.now(),
      x: activePinPos.x,
      y: activePinPos.y,
      comment: pinComment,
      author: 'Current User', // Should come from auth
      created_at: new Date().toISOString()
    };

    setPins([...pins, newPin]);
    setPinComment('');
    setShowPinDialog(false);
    setActivePinPos(null);
  };

  const downloadMarkup = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = 'drawing-markup.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        annotations,
        pins,
        imageData: canvasRef.current.toDataURL()
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {!readOnly && (
        <Card className="p-3 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Tools */}
            <div className="flex items-center gap-1 border-r border-zinc-700 pr-3">
              {[
                { tool: TOOLS.PENCIL, icon: Pencil, label: 'Pencil' },
                { tool: TOOLS.RECTANGLE, icon: Square, label: 'Rectangle' },
                { tool: TOOLS.CIRCLE, icon: Circle, label: 'Circle' },
                { tool: TOOLS.PIN, icon: Pin, label: 'Pin Comment' },
                { tool: TOOLS.ERASER, icon: Eraser, label: 'Eraser' }
              ].map(({ tool: t, icon: Icon, label }) => (
                <Button
                  key={t}
                  size="sm"
                  variant={tool === t ? 'default' : 'ghost'}
                  onClick={() => setTool(t)}
                  className={cn(
                    'h-8 w-8 p-0',
                    tool === t && 'bg-amber-500 text-black hover:bg-amber-600'
                  )}
                  title={label}
                >
                  <Icon size={16} />
                </Button>
              ))}
            </div>

            {/* Colors */}
            <div className="flex items-center gap-1 border-r border-zinc-700 pr-3">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-6 h-6 rounded border-2 transition-all',
                    color === c ? 'border-amber-500 scale-110' : 'border-zinc-700'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {/* Line Width */}
            <div className="flex items-center gap-2 border-r border-zinc-700 pr-3">
              <span className="text-xs text-zinc-400">Width:</span>
              <Input
                type="number"
                min="1"
                max="20"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-16 h-8 text-xs bg-zinc-950 border-zinc-700"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={undo}
                disabled={historyIndex <= 0}
                className="h-8 w-8 p-0"
              >
                <Undo size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="h-8 w-8 p-0"
              >
                <Redo size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={downloadMarkup}
                className="h-8 w-8 p-0"
              >
                <Download size={16} />
              </Button>
              {onSave && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700 h-8"
                >
                  <Save size={16} className="mr-1" />
                  Save
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Canvas */}
      <div className="relative border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="max-w-full h-auto cursor-crosshair"
        />
        
        {/* Pin Markers Overlay */}
        <div ref={overlayRef} className="absolute inset-0 pointer-events-none">
          {pins.map((pin) => (
            <div
              key={pin.id}
              className="absolute pointer-events-auto"
              style={{
                left: `${(pin.x / canvasRef.current?.width || 1) * 100}%`,
                top: `${(pin.y / canvasRef.current?.height || 1) * 100}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <button
                className="w-8 h-8 bg-red-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                title={pin.comment}
              >
                <MessageSquare size={16} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Pin Comments List */}
      {pins.length > 0 && (
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Pin size={14} />
            Pin Comments ({pins.length})
          </h4>
          <div className="space-y-2">
            {pins.map((pin, idx) => (
              <div key={pin.id} className="flex gap-3 p-2 bg-zinc-950 rounded border border-zinc-800">
                <Badge className="bg-red-500 text-white flex-shrink-0">#{idx + 1}</Badge>
                <div className="flex-1">
                  <p className="text-sm text-white">{pin.comment}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {pin.author} • {new Date(pin.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pin Dialog */}
      {showPinDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-96 p-4 bg-zinc-900 border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Pin size={16} />
                Add Pin Comment
              </h3>
              <button
                onClick={() => {
                  setShowPinDialog(false);
                  setActivePinPos(null);
                  setPinComment('');
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <Textarea
              placeholder="Enter your comment..."
              value={pinComment}
              onChange={(e) => setPinComment(e.target.value)}
              className="mb-3 bg-zinc-950 border-zinc-700 text-white"
              rows={4}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPinDialog(false);
                  setActivePinPos(null);
                  setPinComment('');
                }}
                className="flex-1 border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={savePin}
                disabled={!pinComment.trim()}
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                Add Pin
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}