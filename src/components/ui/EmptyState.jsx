import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  actionPage,
  variant = 'default' 
}) {
  const bgColors = {
    default: 'bg-zinc-800/30',
    subtle: 'bg-transparent'
  };

  return (
    <div className={`${bgColors[variant]} rounded-lg p-8 text-center`}>
      <div className="max-w-sm mx-auto">
        {Icon && (
          <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Icon className="text-amber-500" size={24} />
          </div>
        )}
        <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
        <p className="text-zinc-400 text-sm mb-6">{description}</p>
        {actionLabel && actionPage && (
          <Button 
            asChild
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            <Link to={createPageUrl(actionPage)}>
              {actionLabel}
              <ArrowRight size={16} className="ml-2" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}