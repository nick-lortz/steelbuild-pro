import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Pencil, Square, Circle, Type, Pin, Ruler, ArrowRight,
  Download, X, Undo, Redo, Save, Eye, EyeOff, Layers,
  Link as LinkIcon, Trash2, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TOOLS = {
  PENCIL: 'freehand',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  ARROW: 'arrow',
  TEXT: 'text',
  PIN: 'pin',
  MEASUREMENT: 'measurement'
};

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#8b5cf6', '#000000', '#ffffff'];

export default function AdvancedDrawingMarkup({ 
  imageUrl,
  sheetId,
  existingLayers = [],
  availableRFIs = [],
  onSave
}) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState(TOOLS.PENCIL);
  const [color, setColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [currentLayer, setCurrentLayer] = useState('default');
  const [layers, setLayers] = useState(existingLayers.length > 0 ? existingLayers : [{
    name: 'default',
    label: 'Main Markup',
    visible: true,
    annotations: []
  }]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [activePinPos, setActivePinPos] = useState(null);
  const [pinData, setPinData] = useState({ comment: '', linkedRfiId: null });
  const [showLayerManager, setShowLayerManager] = useState(false);
  const [measurementScale, setMeasurementScale] = useState(1); // pixels per foot

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      redraw();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const redraw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Draw visible layers
      layers.filter(l => l.visible).forEach(layer => {
        layer.annotations.forEach(annotation => {
          drawAnnotation(ctx, annotation);
        });
      });
    };
    img.src = imageUrl;
  };

  const drawAnnotation = (ctx, annotation) => {
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
      
      case TOOLS.ARROW:
        drawArrow(ctx, annotation.x, annotation.y, annotation.x + annotation.width, annotation.y + annotation.height);
        break;
      
      case TOOLS.TEXT:
        ctx.font = `${annotation.fontSize || 16}px Arial`;
        ctx.fillText(annotation.text, annotation.x, annotation.y);
        break;
      
      case TOOLS.MEASUREMENT:
        drawMeasurement(ctx, annotation);
        break;
    }
  };

  const drawArrow = (ctx, fromX, fromY, toX, toY) => {
    const headlen = 15;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const drawMeasurement = (ctx, annotation) => {
    const dx = annotation.width;
    const dy = annotation.height;
    const length = Math.sqrt(dx * dx + dy * dy);
    const distance = (length / measurementScale).toFixed(2);

    // Draw line
    ctx.beginPath();
    ctx.moveTo(annotation.x, annotation.y);
    ctx.lineTo(annotation.x + dx, annotation.y + dy);
    ctx.stroke();

    // Draw dimension text
    const midX = annotation.x + dx / 2;
    const midY = annotation.y + dy / 2;
    ctx.fillStyle = '#000000';
    ctx.fillRect(midX - 30, midY - 12, 60, 20);
    ctx.fillStyle = annotation.color;
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${distance}'`, midX, midY + 4);
    ctx.textAlign = 'left';
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
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPos(pos);

    const activeLayer = layers.find(l => l.name === currentLayer);

    if (tool === TOOLS.PENCIL) {
      activeLayer.annotations.push({
        type: TOOLS.PENCIL,
        points: [pos],
        color,
        lineWidth
      });
      setLayers([...layers]);
    } else if (tool === TOOLS.PIN) {
      setActivePinPos(pos);
      setShowPinDialog(true);
      setIsDrawing(false);
    }
  };

  const draw = (e) => {
    if (!isDrawing || !startPos) return;
    const pos = getMousePos(e);

    if (tool === TOOLS.PENCIL) {
      const activeLayer = layers.find(l => l.name === currentLayer);
      const currentAnnotation = activeLayer.annotations[activeLayer.annotations.length - 1];
      currentAnnotation.points.push(pos);
      setLayers([...layers]);
      redraw();
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);
    const activeLayer = layers.find(l => l.name === currentLayer);

    if (tool === TOOLS.RECTANGLE || tool === TOOLS.CIRCLE || tool === TOOLS.ARROW || tool === TOOLS.MEASUREMENT) {
      activeLayer.annotations.push({
        type: tool,
        x: startPos.x,
        y: startPos.y,
        width: pos.x - startPos.x,
        height: pos.y - startPos.y,
        color,
        lineWidth
      });
      setLayers([...layers]);
      addToHistory();
      redraw();
    } else if (tool === TOOLS.PENCIL) {
      addToHistory();
    }

    setIsDrawing(false);
    setStartPos(null);
  };

  const addToHistory = () => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(layers)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setLayers(history[historyIndex - 1]);
      redraw();
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setLayers(history[historyIndex + 1]);
      redraw();
    }
  };

  const savePin = () => {
    if (!pinData.comment.trim() || !activePinPos) return;
    
    const activeLayer = layers.find(l => l.name === currentLayer);
    activeLayer.annotations.push({
      type: TOOLS.PIN,
      x: activePinPos.x,
      y: activePinPos.y,
      comment: pinData.comment,
      linkedRfiId: pinData.linkedRfiId,
      color,
      timestamp: new Date().toISOString()
    });

    setLayers([...layers]);
    setPinData({ comment: '', linkedRfiId: null });
    setShowPinDialog(false);
    setActivePinPos(null);
    addToHistory();
    redraw();
  };

  const toggleLayerVisibility = (layerName) => {
    const updated = layers.map(l => 
      l.name === layerName ? { ...l, visible: !l.visible } : l
    );
    setLayers(updated);
    redraw();
  };

  const addNewLayer = () => {
    const layerNum = layers.length + 1;
    setLayers([...layers, {
      name: `layer_${layerNum}`,
      label: `Layer ${layerNum}`,
      visible: true,
      annotations: []
    }]);
  };

  const deleteLayer = (layerName) => {
    if (layers.length === 1) return;
    const updated = layers.filter(l => l.name !== layerName);
    setLayers(updated);
    if (currentLayer === layerName) {
      setCurrentLayer(updated[0].name);
    }
    redraw();
  };

  const handleSave = async () => {
    if (onSave) {
      await onSave({
        sheetId,
        layers,
        imageData: canvasRef.current?.toDataURL()
      });
    }
  };

  const downloadMarkup = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `drawing-markup-${new Date().getTime()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const activeLayerObj = layers.find(l => l.name === currentLayer);
  const pins = layers.flatMap(l => 
    l.visible ? l.annotations.filter(a => a.type === TOOLS.PIN) : []
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="p-3 bg-zinc-900 border-zinc-800">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Tools */}
          <div className="flex items-center gap-1 border-r border-zinc-700 pr-3">
            {[
              { tool: TOOLS.PENCIL, icon: Pencil, label: 'Freehand' },
              { tool: TOOLS.RECTANGLE, icon: Square, label: 'Rectangle' },
              { tool: TOOLS.CIRCLE, icon: Circle, label: 'Circle' },
              { tool: TOOLS.ARROW, icon: ArrowRight, label: 'Arrow' },
              { tool: TOOLS.TEXT, icon: Type, label: 'Text' },
              { tool: TOOLS.MEASUREMENT, icon: Ruler, label: 'Measure' },
              { tool: TOOLS.PIN, icon: Pin, label: 'Pin' }
            ].map(({ tool: t, icon: Icon, label }) => (
              <Button
                key={t}
                size="sm"
                variant={tool === t ? 'default' : 'ghost'}
                onClick={() => setTool(t)}
                className={cn('h-8 w-8 p-0', tool === t && 'bg-amber-500 text-black')}
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
                  'w-6 h-6 rounded border-2',
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

          {/* Layer Selector */}
          <div className="flex items-center gap-2 border-r border-zinc-700 pr-3">
            <Layers size={14} className="text-zinc-400" />
            <Select value={currentLayer} onValueChange={setCurrentLayer}>
              <SelectTrigger className="w-32 h-8 text-xs bg-zinc-950 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {layers.map(l => (
                  <SelectItem key={l.name} value={l.name}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowLayerManager(!showLayerManager)}
              className="h-8 w-8 p-0"
            >
              <Layers size={14} />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={undo} disabled={historyIndex <= 0} className="h-8 w-8 p-0">
              <Undo size={16} />
            </Button>
            <Button size="sm" variant="ghost" onClick={redo} disabled={historyIndex >= history.length - 1} className="h-8 w-8 p-0">
              <Redo size={16} />
            </Button>
            <Button size="sm" variant="ghost" onClick={downloadMarkup} className="h-8 w-8 p-0">
              <Download size={16} />
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700 h-8">
              <Save size={16} className="mr-1" />
              Save
            </Button>
          </div>
        </div>
      </Card>

      {/* Layer Manager */}
      {showLayerManager && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-white">Layers</h4>
              <Button size="sm" onClick={addNewLayer} className="h-7 bg-amber-500 hover:bg-amber-600 text-black">
                <Plus size={12} className="mr-1" />
                Add Layer
              </Button>
            </div>
            <div className="space-y-2">
              {layers.map(layer => (
                <div key={layer.name} className="flex items-center justify-between p-2 bg-zinc-950 rounded border border-zinc-800">
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      checked={layer.visible}
                      onCheckedChange={() => toggleLayerVisibility(layer.name)}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{layer.label}</div>
                      <div className="text-xs text-zinc-500">{layer.annotations.length} annotations</div>
                    </div>
                  </div>
                  {layers.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteLayer(layer.name)}
                      className="h-7 w-7 p-0 text-red-400"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
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
      </div>

      {/* Pin Dialog */}
      {showPinDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-96 p-4 bg-zinc-900 border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Pin size={16} />
                Add Pin Comment
              </h3>
              <button onClick={() => setShowPinDialog(false)} className="text-zinc-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-zinc-400">Comment</Label>
                <Textarea
                  placeholder="Describe the issue or note..."
                  value={pinData.comment}
                  onChange={(e) => setPinData({ ...pinData, comment: e.target.value })}
                  className="mt-1 bg-zinc-950 border-zinc-700 text-white"
                  rows={3}
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-400">Link to RFI (Optional)</Label>
                <Select
                  value={pinData.linkedRfiId || 'none'}
                  onValueChange={(val) => setPinData({ ...pinData, linkedRfiId: val === 'none' ? null : val })}
                >
                  <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="none">No RFI</SelectItem>
                    {availableRFIs.map(rfi => (
                      <SelectItem key={rfi.id} value={rfi.id}>
                        RFI-{String(rfi.rfi_number).padStart(3, '0')}: {rfi.subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowPinDialog(false)} className="flex-1 border-zinc-700">
                Cancel
              </Button>
              <Button onClick={savePin} disabled={!pinData.comment.trim()} className="flex-1 bg-red-500 hover:bg-red-600">
                Add Pin
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Pin List */}
      {pins.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Pin size={14} />
              Pin Comments ({pins.length})
            </h4>
            <div className="space-y-2">
              {pins.map((pin, idx) => (
                <div key={idx} className="flex gap-3 p-2 bg-zinc-950 rounded border border-zinc-800">
                  <Badge className="bg-red-500 text-white flex-shrink-0">#{idx + 1}</Badge>
                  <div className="flex-1">
                    <p className="text-sm text-white">{pin.comment}</p>
                    {pin.linkedRfiId && (
                      <div className="mt-1">
                        <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                          <LinkIcon size={10} className="mr-1" />
                          Linked to RFI
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}