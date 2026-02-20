import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Breadcrumbs({ items, className }) {
  if (!items || items.length === 0) return null;
  
  return (
    <nav className={cn("flex items-center gap-2 text-sm", className)} aria-label="Breadcrumb">
      <Link 
        to={createPageUrl('ProjectDashboard')}
        className="flex items-center text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <Home size={14} />
      </Link>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight size={14} className="text-zinc-600" />
          
          {item.href && index < items.length - 1 ? (
            <Link 
              to={item.href}
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-zinc-200 font-medium">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}