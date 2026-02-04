import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Building } from 'lucide-react';

const rootPages = ['Dashboard', 'Projects', 'Schedule', 'Financials', 'ResourceManagement', 'Resources', 'Profile', 'RFIHub', 'Analytics'];

const PageHeader = React.memo(function PageHeader({ title, subtitle, actions, showBackButton, onRefresh, isRefreshing = false }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine if this is a root page
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentPage = pathSegments[pathSegments.length - 1] || 'Dashboard';
  const isRootPage = rootPages.some(root => 
    currentPage.toLowerCase() === root.toLowerCase() || 
    location.pathname === '/' ||
    pathSegments.length === 0
  );
  
  // Show back button on non-root pages unless explicitly overridden
  const shouldShowBackButton = showBackButton !== undefined 
    ? showBackButton 
    : !isRootPage;

  return (
    <div className="bg-transparent text-slate-50 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {shouldShowBackButton ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800 lg:hidden">
            <ArrowLeft size={20} />
          </Button>
        ) : (
          <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center lg:hidden">
            <Building size={18} className="text-black" />
          </div>
        )}
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