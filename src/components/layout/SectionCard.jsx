import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * SectionCard - Reusable card wrapper with optional header
 * 
 * @param {string} title - Card title
 * @param {ReactNode} actions - Action elements in header
 * @param {ReactNode} children - Card content
 */
export default function SectionCard({ title, actions, children, className }) {
  return (
    <Card className={cn("bg-zinc-900 border-zinc-800 rounded-lg", className)}>
      {title && (
        <CardHeader className={cn("pb-3", !actions && "pb-4")}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-white">
              {title}
            </CardTitle>
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
        </CardHeader>
      )}
      <CardContent className={cn("p-4", title && "pt-0")}>
        {children}
      </CardContent>
    </Card>
  );
}