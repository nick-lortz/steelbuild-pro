import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Building } from 'lucide-react';

const rootPages = ['Dashboard', 'Projects', 'Schedule', 'Financials', 'ResourceManagement', 'Resources', 'Profile', 'RFIHub', 'Analytics'];

const PageHeader = React.memo(function PageHeader(/** @type {any} */ { title, subtitle, actions, showBackButton, onRefresh, isRefreshing = false }) {
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
    <div className="bg-transparent text-[#E5E7EB] mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {shouldShowBackButton ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="lg:hidden">
            <ArrowLeft size={20} />
          </Button>
        ) : (
          <div 
            className="w-8 h-8 bg-gradient-to-br from-[#FF6B2C] to-[#FF9D42] rounded-lg flex items-center justify-center lg:hidden"
            style={{ boxShadow: '0 0 16px rgba(255, 157, 66, 0.3)' }}
          >
            <Building size={18} className="text-[#0A0E13]" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-[#E5E7EB] tracking-tight">{title}</h1>
          {subtitle && <p className="text-[#9CA3AF] mt-1">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onRefresh &&
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isRefreshing}>

            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </Button>
        }
        {actions}
        </div>
        </div>);

});

export default PageHeader;