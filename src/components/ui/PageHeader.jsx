import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from 'lucide-react';

const PageHeader = React.memo(function PageHeader({ title, subtitle, actions, showBackButton = true, onRefresh, isRefreshing = false }) {
  const navigate = useNavigate();

  return (
    <div className="bg-transparent text-slate-50 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {showBackButton &&
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-zinc-400 hover:text-white hover:bg-zinc-800">

            <ArrowLeft size={20} />
          </Button>
        }
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-zinc-400 mt-1">{subtitle}</p>}
        </div>
      </div>
      <div className="text-slate-950 flex items-center gap-2">
        {onRefresh &&
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isRefreshing} className="bg-background text-slate-50 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm h-9 w-9 border-zinc-700 hover:text-white hover:bg-zinc-800">


            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </Button>
        }
        {actions}
        </div>
        </div>);

});

export default PageHeader;