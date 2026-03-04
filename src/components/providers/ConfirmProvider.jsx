import React, { createContext, useContext, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
    onCancel: () => {},
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'destructive',
  });

  const confirm = ({
    title = 'Are you sure?',
    description = 'This action cannot be undone.',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'destructive',
  }) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        description,
        confirmText,
        cancelText,
        variant,
        onConfirm: () => {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog
        open={confirmState.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            confirmState.onCancel();
          }
        }}
      >
        <AlertDialogContent
          className="bg-[#14181E] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.70)]"
          style={{ backdropFilter: 'blur(12px)' }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[rgba(255,255,255,0.92)] text-[1rem] font-bold">
              {confirmState.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[rgba(255,255,255,0.45)] text-[0.8125rem]">
              {confirmState.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={confirmState.onCancel}
              className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.60)] rounded-[10px] hover:bg-[rgba(255,255,255,0.08)] hover:text-[rgba(255,255,255,0.88)] focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14181E]"
            >
              {confirmState.cancelText}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmState.onConfirm}
              className={
                confirmState.variant === 'destructive'
                  ? 'bg-[rgba(255,77,77,0.12)] border border-[rgba(255,77,77,0.25)] text-[#FF4D4D] rounded-[10px] hover:bg-[rgba(255,77,77,0.22)] focus-visible:ring-2 focus-visible:ring-[#FF4D4D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14181E]'
                  : 'bg-gradient-to-r from-[#FF5A1F] to-[#FF7A2F] text-white rounded-[10px] border-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14181E]'
              }
            >
              {confirmState.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return context;
}