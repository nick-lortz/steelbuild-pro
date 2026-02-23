import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Eraser, Square, Circle, ArrowRight, Type, Trash2, Download, Undo, Redo } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Whiteboard({ sessionId, initialData, onSave }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#FF6B2C');
  const [lineWidth, setLineWidth] = useState(3);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    if (initialData?.strokes) {
      redrawCanvas(initialData.strokes);
    }
  }, []);

  const redrawCanvas = (strokes) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes.forEach(stroke => {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.lineWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      
      stroke.points.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? 20 : lineWidth;
    ctx.lineCap = 'round';
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(canvas.toDataURL());
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
    
    if (onSave) {
      onSave({ imageData: canvas.toDataURL() });
    }
  };

  const undo = () => {
    if (historyStep > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = history[historyStep - 1];
      setHistoryStep(historyStep - 1);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = history[historyStep + 1];
      setHistoryStep(historyStep + 1);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
        <Button
          variant={tool === 'pencil' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('pencil')}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant={tool === 'eraser' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('eraser')}>
          <Eraser className="w-4 h-4" />
        </Button>
        
        <div className="h-6 w-px bg-border mx-2" />
        
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-10 h-10 rounded border cursor-pointer"
        />
        
        <input
          type="range"
          min="1"
          max="10"
          value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
          className="w-24"
        />
        
        <div className="h-6 w-px bg-border mx-2" />
        
        <Button variant="outline" size="sm" onClick={undo} disabled={historyStep <= 0}>
          <Undo className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={redo} disabled={historyStep >= history.length - 1}>
          <Redo className="w-4 h-4" />
        </Button>
        
        <div className="flex-1" />
        
        <Button variant="outline" size="sm" onClick={clearCanvas}>
          <Trash2 className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={downloadCanvas}>
          <Download className="w-4 h-4" />
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative bg-white">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="w-full h-full cursor-crosshair"
        />
      </div>
    </div>
  );
}