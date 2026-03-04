/**
 * SignOffModal — blocks high-risk or high-cost actions until a qualified PM/engineer
 * explicitly approves, with a 6-digit confirmation code for budget-threshold actions.
 */
import React, { useState } from 'react';
import { ShieldAlert, User, CheckCircle2, XCircle, Lock, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FLAG_META = {
  safety:       { label: 'Structural Safety Risk',  color: '#FF4D4D',  icon: ShieldAlert },
  regulatory:   { label: 'Regulatory / Code Issue', color: '#FFB15A',  icon: AlertTriangle },
  contractual:  { label: 'Contractual Exposure',    color: '#C084FC',  icon: Lock },
  budget_threshold: { label: 'Budget Threshold',    color: '#4DA3FF',  icon: Lock },
  pii:          { label: 'PII Detected in Upload',  color: '#FF4D4D',  icon: ShieldAlert },
};

export default function SignOffModal({ output, flags = [], onApprove, onReject, budgetThreshold = 5000 }) {
  const [role, setRole] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [generatedCode] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [step, setStep] = useState(1); // 1=review, 2=confirm code (budget only)
  const [error, setError] = useState('');

  const needsBudgetConfirm = flags.includes('budget_threshold') && (output?.cost_impact || 0) >= budgetThreshold;
  const isSafetyOrRegulatory = flags.some(f => ['safety', 'regulatory'].includes(f));

  function handleApprove() {
    if (!role.trim()) { setError('Role / name is required for sign-off.'); return; }
    if (needsBudgetConfirm && step === 1) {
      // Show code step — in production you'd send this via email/SMS
      setStep(2);
      setError('');
      return;
    }
    if (needsBudgetConfirm && step === 2 && confirmCode !== generatedCode) {
      setError('Confirmation code does not match.');
      return;
    }
    setError('');
    onApprove({ role, notes, signoff_by: role });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      role="dialog" aria-modal="true" aria-label="Sign-off required"
    >
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-md rounded-2xl border overflow-hidden"
        style={{ background: '#0D1117', borderColor: 'rgba(255,77,77,0.25)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,77,77,0.06)' }}>
          <ShieldAlert size={16} style={{ color: '#FF4D4D', flexShrink: 0 }} />
          <div className="flex-1">
            <p className="text-[0.8rem] font-bold text-white">Sign-Off Required</p>
            <p className="text-[0.6rem] text-[rgba(255,255,255,0.40)]">This action requires qualified PM or Engineer approval</p>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Flags */}
          <div className="flex flex-col gap-1.5">
            {flags.filter(f => FLAG_META[f]).map(f => {
              const m = FLAG_META[f];
              return (
                <div key={f} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: m.color + '12', border: `1px solid ${m.color}25` }}>
                  <m.icon size={12} style={{ color: m.color, flexShrink: 0 }} />
                  <span className="text-[0.68rem] font-semibold" style={{ color: m.color }}>{m.label}</span>
                </div>
              );
            })}
          </div>

          {/* Output summary */}
          <div className="px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[0.62rem] font-bold tracking-[0.08em] uppercase text-[rgba(255,255,255,0.30)] mb-1">Action being approved</p>
            <p className="text-[0.78rem] font-semibold text-[rgba(255,255,255,0.88)]">{output?.title || output?.subject || output?.description || 'AI-generated action'}</p>
            {output?.cost_impact > 0 && (
              <p className="text-[0.68rem] text-[#4DD6A4] mt-0.5">Cost impact: ${output.cost_impact.toLocaleString()}</p>
            )}
            {output?.justification && (
              <p className="text-[0.65rem] text-[rgba(255,255,255,0.40)] mt-1 leading-relaxed">{output.justification}</p>
            )}
          </div>

          {/* Safety/regulatory warning */}
          {isSafetyOrRegulatory && (
            <div className="flex gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,177,90,0.06)', border: '1px solid rgba(255,177,90,0.18)' }}>
              <Info size={13} style={{ color: '#FFB15A', flexShrink: 0, marginTop: 1 }} />
              <p className="text-[0.65rem] text-[rgba(255,177,90,0.80)] leading-relaxed">
                This action involves a structural safety or regulatory flag. Only a licensed PE or qualified EOR representative may approve. Ensure compliance with AISC 360, OSHA 1926 Subpart R, and applicable contract documents before proceeding.
              </p>
            </div>
          )}

          {step === 1 && (
            <>
              {/* Role / name */}
              <div>
                <label className="text-[0.6rem] font-bold tracking-[0.10em] uppercase text-[rgba(255,255,255,0.35)] block mb-1" htmlFor="ps-signoff-role">
                  Your Name / Role *
                </label>
                <input id="ps-signoff-role" value={role} onChange={e => setRole(e.target.value)}
                  placeholder="e.g. J. Smith, PE — Structural Engineer"
                  className="w-full bg-[#14181E] border border-[rgba(255,255,255,0.09)] rounded-lg px-3 py-2 text-[0.78rem] text-[rgba(255,255,255,0.88)] placeholder:text-[rgba(255,255,255,0.22)] focus:outline-none focus:border-[rgba(255,90,31,0.40)]"
                />
              </div>
              {/* Notes */}
              <div>
                <label className="text-[0.6rem] font-bold tracking-[0.10em] uppercase text-[rgba(255,255,255,0.35)] block mb-1" htmlFor="ps-signoff-notes">
                  Decision Notes <span className="text-[rgba(255,255,255,0.20)]">(optional)</span>
                </label>
                <textarea id="ps-signoff-notes" value={notes} onChange={e => setNotes(e.target.value)}
                  rows={2} placeholder="Add basis of approval or conditions…"
                  className="w-full bg-[#14181E] border border-[rgba(255,255,255,0.09)] rounded-lg px-3 py-2 text-[0.78rem] text-[rgba(255,255,255,0.88)] placeholder:text-[rgba(255,255,255,0.22)] focus:outline-none focus:border-[rgba(255,90,31,0.40)] resize-none"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <div>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3" style={{ background: 'rgba(77,163,255,0.08)', border: '1px solid rgba(77,163,255,0.20)' }}>
                <Lock size={12} style={{ color: '#4DA3FF' }} />
                <p className="text-[0.65rem] text-[rgba(77,163,255,0.80)]">
                  Budget threshold exceeded (${(output?.cost_impact || 0).toLocaleString()}). Enter confirmation code: <strong className="text-[#4DA3FF] font-mono">{generatedCode}</strong>
                  <br /><span className="text-[rgba(77,163,255,0.50)]">In production this code is sent via email/2FA.</span>
                </p>
              </div>
              <input value={confirmCode} onChange={e => setConfirmCode(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
                className="w-full bg-[#14181E] border border-[rgba(255,255,255,0.09)] rounded-lg px-3 py-2 text-[0.9rem] font-mono text-center text-[rgba(255,255,255,0.88)] placeholder:text-[rgba(255,255,255,0.22)] focus:outline-none focus:border-[rgba(255,90,31,0.40)] tracking-[0.3em]"
              />
            </div>
          )}

          {error && (
            <p className="text-[0.68rem] text-[#FF4D4D] flex items-center gap-1">
              <XCircle size={11} /> {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onReject}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[0.72rem] font-bold transition-all hover:opacity-80"
              style={{ background: 'rgba(255,77,77,0.10)', border: '1px solid rgba(255,77,77,0.20)', color: '#FF4D4D' }}
            >
              <XCircle size={13} /> Reject
            </button>
            <button onClick={handleApprove}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[0.72rem] font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(90deg,rgba(77,214,164,0.80),rgba(77,214,164,0.60))', border: '1px solid rgba(77,214,164,0.25)' }}
            >
              <CheckCircle2 size={13} /> {needsBudgetConfirm && step === 1 ? 'Continue →' : 'Approve & Proceed'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}