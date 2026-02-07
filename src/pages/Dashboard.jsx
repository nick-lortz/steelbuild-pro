import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/components/shared/hooks/useDebounce';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { 
  RefreshCw, TrendingUp, TrendingDown, DollarSign, Users, 
  Building, AlertTriangle, Clock, Flag, Activity, Zap, FileText, Mail, Download
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import ProjectHealthTable from '@/components/dashboard/ProjectHealthTable';
import ProjectFiltersBar from '@/components/dashboard/ProjectFiltersBar';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { usePagination } from '@/components/shared/hooks/usePagination';
import Pagination from '@/components/ui/Pagination';
import AIRiskPanel from '@/components/dashboard/AIRiskPanel';
import RoleBasedKPIs from '@/components/dashboard/RoleBasedKPIs';
import AIForecastPanel from '@/components/dashboard/AIForecastPanel';
import ReportScheduler from '@/components/reports/ReportScheduler';

export default function Dashboard() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('risk');
  const [showAIRisk, setShowAIRisk] = useState(false);
  const [showReportScheduler, setShowReportScheduler] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const { page, pageSize, skip, limit, goToPage, changePageSize } = usePagination(1, 25);

 const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

  const { 
    data: dashboardData = { projects: [], metrics: {}, pagination: {} }, 
    isLoading: projectsLoading, 
    isFetching: projectsFetching, 
    refetch: refetchDashboard 
  } = useQuery({
    queryKey: ['dashboard', { page, pageSize, search: debouncedSearch, status: statusFilter, risk: riskFilter, sort: sortBy }],
    queryFn: async () => {
      const response = await base44.functions.invoke('getDashboardData', {
        page,
        pageSize,
        search: debouncedSearch,
        status: statusFilter,
        risk: riskFilter,
        sort: sortBy
      });
      return response.data;

      // ✅ Normalize Base44 invoke response shapes so dashboardData.metrics/projects/pagination are real
      const d = response?.data ?? response;
      const normalized =
        (d?.metrics || d?.projects || d?.pagination) ? d :
        (d?.data?.metrics || d?.data?.projects || d?.data?.pagination) ? d.data :
        (d?.body?.metrics || d?.body?.projects || d?.body?.pagination) ? d.body :
        (d?.result?.metrics || d?.result?.projects || d?.result?.pagination) ? d.result :
        d;

      // ✅ Verifiable proof in console (remove later if you want)
      console.debug('[getDashboardData] raw response:', response);
      console.debug('[getDashboardData] normalized:', normalized);
      console.debug('[getDashboardData] metrics keys:', Object.keys(normalized?.metrics || {}));

      return normalized;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000
  });

  const projects = dashboardData?.projects || [];
  const metrics = dashboardData?.metrics || {};
  const pagination = dashboardData?.pagination || {};

  // Safe metric accessors
  const totalProjects = metrics?.totalProjects || 0;
  const activeProjects = metrics?.activeProjects || 0;
  const totalContractValue = metrics?.totalContractValue || 0;
  const avgBudgetVariance = metrics?.avgBudgetVariance || 0;
  const atRiskProjects = metrics?.atRiskProjects || 0;

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      const response = await base44.functions.invoke('generateDashboardPDF', {});
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
@@ -229,26 +244,26 @@ export default function Dashboard() {
              onProjectClick={(project) => setActiveProjectId(project.id)}
            />
            
            <Pagination
              total={pagination.total || 0}
              page={page}
              pageSize={pageSize}
              onPageChange={goToPage}
              onPageSizeChange={changePageSize}
            />
          </>
        )}

        {/* Report Scheduler Sheet */}
        <Sheet open={showReportScheduler} onOpenChange={setShowReportScheduler}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Schedule Executive Report</SheetTitle>
            </SheetHeader>
            <ReportScheduler onClose={() => setShowReportScheduler(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </ErrorBoundary>
  );
}
}