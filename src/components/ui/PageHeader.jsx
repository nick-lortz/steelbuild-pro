import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from 'lucide-react';

export default function PageHeader({ title, subtitle, actions, showBackButton = true, onRefresh, isRefreshing = false }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <ArrowLeft size={20} />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-zinc-400 mt-1">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
}