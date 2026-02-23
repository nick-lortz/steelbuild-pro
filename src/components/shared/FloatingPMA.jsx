import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { cn } from '@/lib/utils';

export default function FloatingPMA() {
  const navigate = useNavigate();
  const { activeProjectId } = useActiveProject();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    navigate(createPageUrl('ProjectAssistant'));
  };

  if (!activeProjectId) return null;

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'w-14 h-14 rounded-full',
        'bg-gradient-to-br from-amber-500 to-orange-600',
        'shadow-lg hover:shadow-xl',
        'flex items-center justify-center',
        'transition-all duration-300',
        'hover:scale-110 active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
        'group'
      )}
      style={{
        boxShadow: isHovered 
          ? '0 0 40px rgba(245, 158, 11, 0.6), 0 20px 40px rgba(0, 0, 0, 0.3)' 
          : '0 0 20px rgba(245, 158, 11, 0.4), 0 10px 25px rgba(0, 0, 0, 0.2)'
      }}
      aria-label="Open Project Manager Assistant">
      <Sparkles className="w-6 h-6 text-black group-hover:animate-pulse" />
      {isHovered && (
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-black/90 text-white text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none">
          Project Manager Assistant
        </div>
      )}
    </button>
  );
}