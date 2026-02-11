import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Users, Shield, Settings, DollarSign, FileText, Database, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import UserManagement from '@/components/admin/UserManagement';
import RolesPermissions from '@/components/admin/RolesPermissions';
import ProjectGovernance from '@/components/admin/ProjectGovernance';
import FinancialDefaults from '@/components/admin/FinancialDefaults';
import SystemSettings from '@/components/admin/SystemSettings';
import ReportingAuditLogs from '@/components/admin/ReportingAuditLogs';
import DataManagement from '@/components/admin/DataManagement';

const adminModules = [
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'permissions', label: 'Roles & Permissions', icon: Shield },
  { id: 'governance', label: 'Project Governance', icon: FileText },
  { id: 'financials', label: 'Financial Defaults', icon: DollarSign },
  { id: 'settings', label: 'System Settings', icon: Settings },
  { id: 'audit', label: 'Reporting & Audit', icon: BarChart3 },
  { id: 'data', label: 'Data Management', icon: Database }
];

export default function AdminPage() {
  const [activeModule, setActiveModule] = useState('users');
  const [isAuthorized, setIsAuthorized] = useState(false);

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        window.location.href = '/';
        return null;
      }
      return user;
    }
  });

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      setIsAuthorized(true);
    }
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'users':
        return <UserManagement />;
      case 'permissions':
        return <RolesPermissions />;
      case 'governance':
        return <ProjectGovernance />;
      case 'financials':
        return <FinancialDefaults />;
      case 'settings':
        return <SystemSettings />;
      case 'audit':
        return <ReportingAuditLogs />;
      case 'data':
        return <DataManagement />;
      default:
        return <UserManagement />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-card border-r border-border p-4">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground mb-1">Admin Panel</h2>
            <p className="text-xs text-muted-foreground">System Administration</p>
          </div>
          <nav className="space-y-1">
            {adminModules.map((module) => {
              const Icon = module.icon;
              return (
                <button
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                    activeModule === module.id
                      ? 'bg-amber-500 text-black'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon size={18} />
                  {module.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {renderModule()}
        </main>
      </div>
    </div>
  );
}