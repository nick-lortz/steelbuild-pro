/**
 * ProjectSolverChat — main chat UI for ProjectSolver assistant.
 * Handles: text input, file upload, image annotation, message history,
 * structured output cards, and session persistence.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Camera, RotateCcw, Bot, User, Loader2, X, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import FileUploadZone from './FileUploadZone';
import ImageAnnotator from './ImageAnnotator';
import StructuredOutputCard from './StructuredOutputCard';

export default function ProjectSolverChat({ projectId, onClose, onStructuredOutput, onSessionCreated, initialSession }) {
  const { activeProjectId } = useActiveProject();
  const pid = projectId || activeProjectId;

  const [sessionId, setSessionId] = useState(initialSession?.id || null);
  const [messages, setMessages] = useState(initialSession?.messages || []);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showAnnotator, setShowAnnotator] = useState(false);
  const [annotatingUrl, setAnnotatingUrl] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingAnnotations, setPendingAnnotations] = useState([]);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    if ((!input.trim() && !pendingFiles.length) || sending || !pid) return;
    setSending(true);

    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      file_urls: pendingFiles.map(f => f.url),
      file_names: pendingFiles.map(f => f.name),
      annotations: pendingAnnotations,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setPendingFiles([]);
    setPendingAnnotations([]);
    setShowUpload(false);
    setShowAnnotator(false);

    try {
      const res = await base44.functions.invoke('projectSolverChat', {
        session_id: sessionId,
        project_id: pid,
        message: userMsg.content,
        file_urls: userMsg.file_urls,
        file_names: userMsg.file_names,
        annotations: userMsg.annotations,
      });

      if (res.data?.session_id && !sessionId) {
        setSessionId(res.data.session_id);
        onSessionCreated?.({ id: res.data.session_id, title: userMsg.content?.slice(0, 60) || 'Session' });
      }

      const assistantMsg = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.data?.content || '',
        structured_output: res.data?.structured_output,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (res.data?.structured_output) onStructuredOutput?.(res.data.structured_output, res.data.session_id);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: `Error: ${e.message}`, created_at: new Date().toISOString(),
      }]);
    }
    setSending(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function handleImageAnnotation(annotations) {
    setPendingAnnotations(annotations);
    setShowAnnotator(false);
  }

  function handlePhotoUpload(files) {
    // After file is uploaded, open annotator for first image
    const imgs = files.filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f.name));
    if (imgs.length > 0) {
      setAnnotatingUrl(imgs[imgs.length - 1].url);
      setShowAnnotator(true);
    }
    setPendingFiles(files);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full" style={{ background: '#0B0D10' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(13,17,23,0.97)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#FF5A1F,#FF7A2F)' }}>
          <Bot size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.8125rem] font-bold text-[rgba(255,255,255,0.92)]">ProjectSolver</p>
          <p className="text-[0.6rem] text-[rgba(255,255,255,0.35)] tracking-wide">Structural steel AI · text · drawings · photos</p>
        </div>
        {sessionId && (
          <button onClick={() => { setSessionId(null); setMessages([]); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[0.65rem] text-[rgba(255,255,255,0.35)] hover:text-[rgba(255,255,255,0.70)] hover:bg-[rgba(255,255,255,0.05)] transition-all"
          ><RotateCcw size={11} /> New</button>
        )}
        {onClose && (
          <button onClick={onClose} className="text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.70)] transition-colors" aria-label="Close"><X size={16} /></button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center gap-4 h-full py-12 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,90,31,0.12)', border: '1px solid rgba(255,90,31,0.20)' }}>
              <Bot size={22} style={{ color: '#FF5A1F' }} />
            </div>
            <div>
              <p className="text-[0.875rem] font-bold text-[rgba(255,255,255,0.88)] mb-1">ProjectSolver</p>
              <p className="text-[0.75rem] text-[rgba(255,255,255,0.40)] max-w-[280px]">
                Upload drawings, RFIs, site photos, or describe your field issue. I'll extract problems, draft RFIs, flag risks, and propose solutions.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Analyze this drawing for connection issues', 'Draft an RFI for missing embed dimensions', 'What are the erection sequence risks?'].map(s => (
                <button key={s} onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                  className="px-3 py-1.5 rounded-lg text-[0.7rem] text-[rgba(255,255,255,0.55)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,90,31,0.30)] hover:text-[rgba(255,255,255,0.80)] hover:bg-[rgba(255,90,31,0.05)] transition-all"
                >{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(255,90,31,0.15)' }}>
                <Bot size={12} style={{ color: '#FF5A1F' }} />
              </div>
            )}
            <div className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {/* File attachments */}
              {msg.file_names?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {msg.file_names.map((n, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md text-[0.62rem] text-[rgba(255,255,255,0.55)] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.06)]">{n}</span>
                  ))}
                </div>
              )}
              {/* Annotations summary */}
              {msg.annotations?.length > 0 && (
                <span className="text-[0.62rem] text-[rgba(255,90,31,0.70)] mb-0.5">{msg.annotations.length} annotation{msg.annotations.length > 1 ? 's' : ''} marked</span>
              )}
              {/* Bubble */}
              <div className={`px-3 py-2.5 rounded-2xl text-[0.8125rem] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#1A1F27] text-[rgba(255,255,255,0.88)] rounded-tr-sm'
                  : 'bg-[#14181E] text-[rgba(255,255,255,0.82)] rounded-tl-sm border border-[rgba(255,255,255,0.05)]'
              }`}>
                {msg.role === 'assistant' ? (
                  <ReactMarkdown
                    className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                    components={{
                      p: ({ children }) => <p className="my-1 text-[rgba(255,255,255,0.80)]">{children}</p>,
                      strong: ({ children }) => <strong className="text-[rgba(255,255,255,0.92)] font-bold">{children}</strong>,
                      ul: ({ children }) => <ul className="ml-3 my-1 list-disc text-[rgba(255,255,255,0.70)]">{children}</ul>,
                      li: ({ children }) => <li className="my-0.5">{children}</li>,
                      code: ({ children }) => <code className="bg-[rgba(255,255,255,0.06)] px-1 py-0.5 rounded text-[0.75rem] text-[#4DA3FF]">{children}</code>,
                    }}
                  >{msg.content}</ReactMarkdown>
                ) : msg.content}
              </div>
              {/* Structured output */}
              {msg.structured_output && (
                <StructuredOutputCard output={msg.structured_output} projectId={pid} />
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 bg-[rgba(255,255,255,0.06)]">
                <User size={12} style={{ color: 'rgba(255,255,255,0.50)' }} />
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(255,90,31,0.15)' }}>
              <Bot size={12} style={{ color: '#FF5A1F' }} />
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl rounded-tl-sm bg-[#14181E] border border-[rgba(255,255,255,0.05)]">
              <Loader2 size={12} className="animate-spin" style={{ color: '#FF5A1F' }} />
              <span className="text-[0.75rem] text-[rgba(255,255,255,0.40)]">Analyzing…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Upload zones */}
      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
            className="px-4 pb-3 border-t border-[rgba(255,255,255,0.06)] overflow-hidden"
          >
            <div className="pt-3">
              <FileUploadZone
                onFilesReady={files => {
                  setPendingFiles(files);
                  const imgs = files.filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f.name));
                  if (imgs.length > 0) { setAnnotatingUrl(imgs[imgs.length - 1].url); setShowAnnotator(true); }
                }}
              />
            </div>
          </motion.div>
        )}
        {showAnnotator && annotatingUrl && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
            className="px-4 pb-3 border-t border-[rgba(255,255,255,0.06)] overflow-hidden"
          >
            <div className="pt-3">
              <ImageAnnotator
                imageUrl={annotatingUrl}
                onDone={handleImageAnnotation}
                onCancel={() => setShowAnnotator(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(13,17,23,0.97)' }}>
        {/* Pending files indicator */}
        {pendingFiles.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[0.65rem] text-[rgba(255,90,31,0.80)]">{pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''} ready</span>
            {pendingAnnotations.length > 0 && <span className="text-[0.65rem] text-[rgba(77,214,164,0.80)]">· {pendingAnnotations.length} annotation{pendingAnnotations.length > 1 ? 's' : ''}</span>}
            <button onClick={() => { setPendingFiles([]); setPendingAnnotations([]); }} className="text-[rgba(255,255,255,0.25)] hover:text-[#FF4D4D] transition-colors ml-1"><X size={11} /></button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex gap-1">
            <button onClick={() => { setShowUpload(p => !p); setShowAnnotator(false); }}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${showUpload ? 'bg-[rgba(255,90,31,0.15)] text-[#FF5A1F]' : 'text-[rgba(255,255,255,0.35)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[rgba(255,255,255,0.70)]'}`}
              aria-label="Attach files"
            ><Paperclip size={15} /></button>
            <button onClick={() => { setShowAnnotator(p => !p); setShowUpload(false); }}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${showAnnotator ? 'bg-[rgba(255,90,31,0.15)] text-[#FF5A1F]' : 'text-[rgba(255,255,255,0.35)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[rgba(255,255,255,0.70)]'}`}
              aria-label="Annotate photo"
            ><Camera size={15} /></button>
          </div>

          <textarea ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the issue, paste RFI text, or ask a question…"
            rows={1}
            className="flex-1 bg-[#14181E] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-[0.8125rem] text-[rgba(255,255,255,0.88)] placeholder:text-[rgba(255,255,255,0.22)] focus:outline-none focus:border-[rgba(255,90,31,0.40)] resize-none transition-all duration-150"
            style={{ minHeight: 36, maxHeight: 140, overflowY: 'auto' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'; }}
          />

          <button onClick={send} disabled={sending || (!input.trim() && !pendingFiles.length) || !pid}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none"
            style={{ background: 'linear-gradient(135deg,#FF5A1F,#FF7A2F)' }}
            aria-label="Send"
          >
            {sending ? <Loader2 size={14} className="text-white animate-spin" /> : <Send size={14} className="text-white" />}
          </button>
        </div>
        <p className="text-[0.58rem] text-[rgba(255,255,255,0.18)] mt-1.5 text-center">Enter to send · Shift+Enter for new line · PDF, DWG, XLSX, images supported</p>
      </div>
    </div>
  );
}