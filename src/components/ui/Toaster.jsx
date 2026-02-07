import React from 'react';
import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      expand={true}
      richColors
      closeButton
      toastOptions={{
        style: {
          background: '#18181b',
          border: '1px solid #3f3f46',
          color: '#fff',
        },
        className: 'sonner-toast',
      }}
    />
  );
}