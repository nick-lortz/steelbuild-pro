import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FolderBreadcrumb({ currentPath, onNavigate }) {
  const parts = currentPath === '/' ? [] : currentPath.split('/').filter(Boolean);

  const handleNavigate = (path) => {
    onNavigate(path === '' ? '/' : '/' + path);
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleNavigate('')}
        className={`h-8 px-2 text-xs ${
          currentPath === '/' ? 'bg-zinc-800 text-amber-500' : 'text-zinc-400 hover:text-white'
        }`}
      >
        <Home size={14} />
      </Button>

      {parts.map((part, idx) => {
        const path = '/' + parts.slice(0, idx + 1).join('/');
        return (
          <React.Fragment key={idx}>
            <ChevronRight size={14} className="text-zinc-600 flex-shrink-0" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNavigate(path.slice(1))}
              className={`h-8 px-2 text-xs truncate ${
                currentPath === path ? 'bg-zinc-800 text-amber-500' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {part}
            </Button>
          </React.Fragment>
        );
      })}
    </div>
  );
}