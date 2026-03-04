/**
 * ImageAnnotator — lightweight canvas-based photo annotation.
 * Users can draw rectangles and add text labels on site photos.
 * Produces annotations array: [{ x, y, w, h, label, color }]
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Pencil, Square, Type, Trash2, Check } from 'lucide-react';

const ANNOTATION_COLORS = ['#FF5A1F', '#FF4D4D', '#FFB15A', '#4DA3FF', '#4DD6A4'];

export default function ImageAnnotator({ imageUrl, onDone, onCancel }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [annotations, setAnnotations] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [startPt, setStartPt] = useState(null);
  const [currentRect, setCurrentRect] = useState(null);
  const [labelInput, setLabelInput] = useState('');
  const [pendingRect, setPendingRect] = useState(null);
  const [colorIdx, setColorIdx] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);

  const color = ANNOTATION_COLORS[colorIdx % ANNOTATION_COLORS.length];

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    [...annotations, currentRect].filter(Boolean).forEach(ann => {
      ctx.strokeStyle = ann.color || '#FF5A1F';
      ctx.lineWidth = 2;
      ctx.strokeRect(ann.x, ann.y, ann.w, ann.h);
      if (ann.label) {
        ctx.fillStyle = ann.color || '#FF5A1F';
        ctx.font = 'bold 11px Inter, sans-serif';
        const tw = ctx.measureText(ann.label).width + 8;
        ctx.fillRect(ann.x, ann.y - 18, tw, 18);
        ctx.fillStyle = '#fff';
        ctx.fillText(ann.label, ann.x + 4, ann.y - 4);
      }
    });
  }, [annotations, currentRect, imgLoaded]);

  useEffect(() => { redraw(); }, [redraw]);

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function onMouseDown(e) {
    if (pendingRect) return;
    const pt = getPos(e);
    setStartPt(pt);
    setDrawing(true);
  }

  function onMouseMove(e) {
    if (!drawing || !startPt) return;
    const pt = getPos(e);
    setCurrentRect({
      x: Math.min(startPt.x, pt.x),
      y: Math.min(startPt.y, pt.y),
      w: Math.abs(pt.x - startPt.x),
      h: Math.abs(pt.y - startPt.y),
      color,
    });
  }

  function onMouseUp() {
    if (!drawing || !currentRect || currentRect.w < 10) { setDrawing(false); setCurrentRect(null); return; }
    setPendingRect({ ...currentRect });
    setCurrentRect(null);
    setDrawing(false);
    setLabelInput('');
  }

  function confirmLabel() {
    if (!pendingRect) return;
    const ann = { ...pendingRect, label: labelInput || 'Issue', id: crypto.randomUUID() };
    setAnnotations(prev => [...prev, ann]);
    setPendingRect(null);
    setLabelInput('');
  }

  function removeAnnotation(id) {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  }

  function handleImageLoad() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    setImgLoaded(true);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[0.6rem] font-bold tracking-[0.10em] uppercase text-[rgba(255,255,255,0.35)]">Color</span>
        {ANNOTATION_COLORS.map((c, i) => (
          <button key={c} onClick={() => setColorIdx(i)}
            className="w-5 h-5 rounded-full border-2 transition-all"
            style={{ background: c, borderColor: colorIdx === i ? '#fff' : 'transparent' }}
            aria-label={`Color ${i + 1}`}
          />
        ))}
        <div className="ml-auto flex gap-1.5">
          <button onClick={() => setAnnotations([])}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[0.68rem] text-[rgba(255,255,255,0.40)] hover:text-[#FF4D4D] hover:bg-[rgba(255,77,77,0.08)] transition-all"
          ><Trash2 size={12} /> Clear</button>
          <button onClick={() => onDone?.(annotations)}
            className="flex items-center gap-1 px-3 py-1 rounded-lg text-[0.68rem] font-bold text-white bg-gradient-to-r from-[#FF5A1F] to-[#FF7A2F] hover:opacity-90 transition-all"
          ><Check size={12} /> Done</button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[#0B0D10]"
        style={{ cursor: pendingRect ? 'default' : 'crosshair' }}>
        <img ref={imgRef} src={imageUrl} onLoad={handleImageLoad} className="hidden" alt="" />
        <canvas ref={canvasRef}
          className="w-full h-auto max-h-[420px] object-contain select-none"
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
        />
        {/* Label input overlay */}
        {pendingRect && (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(11,13,16,0.60)]">
            <div className="bg-[#14181E] border border-[rgba(255,255,255,0.10)] rounded-xl p-4 flex flex-col gap-3 min-w-[220px]">
              <p className="text-[0.72rem] font-bold text-[rgba(255,255,255,0.70)]">Label this annotation</p>
              <input autoFocus value={labelInput} onChange={e => setLabelInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmLabel()}
                placeholder="e.g. Missing weld, Misaligned beam"
                className="bg-[#0B0D10] border border-[rgba(255,255,255,0.10)] rounded-[8px] px-3 py-1.5 text-[0.8rem] text-[rgba(255,255,255,0.88)] placeholder:text-[rgba(255,255,255,0.20)] focus:outline-none focus:border-[rgba(255,90,31,0.50)]"
              />
              <div className="flex gap-2">
                <button onClick={() => setPendingRect(null)} className="flex-1 py-1.5 rounded-lg text-[0.68rem] text-[rgba(255,255,255,0.40)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] transition-all">Cancel</button>
                <button onClick={confirmLabel} className="flex-1 py-1.5 rounded-lg text-[0.68rem] font-bold text-white bg-gradient-to-r from-[#FF5A1F] to-[#FF7A2F] hover:opacity-90 transition-all">Add</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Annotation list */}
      {annotations.length > 0 && (
        <div className="flex flex-col gap-1">
          {annotations.map(ann => (
            <div key={ann.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.03)]">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: ann.color }} />
              <span className="text-[0.72rem] text-[rgba(255,255,255,0.70)] flex-1">{ann.label}</span>
              <button onClick={() => removeAnnotation(ann.id)} className="text-[rgba(255,255,255,0.20)] hover:text-[#FF4D4D] transition-colors"><Trash2 size={11} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}