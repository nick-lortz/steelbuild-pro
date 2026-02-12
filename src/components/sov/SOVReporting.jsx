import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTable from '@/components/ui/DataTable';
import { FileText, Download, Filter } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import jsPDF from 'jspdf';

export default function SOVReporting({ sovItems = [], expenses = [] }) {
  const [filters, setFilters] = useState({
    category: 'all',
    search: '',
    sortBy: 'code',
    sortOrder: 'asc'
  });

  const formatCurrency = (value) => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const reportData = useMemo(() => {
    return sovItems.map(sov => {
      const sovExpenses = expenses.filter(e => 
        e.sov_code === sov.sov_code && 
        (e.payment_status === 'paid' || e.payment_status === 'approved')
      );
      const actualCost = sovExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const earned = ((sov.scheduled_value || 0) * (sov.percent_complete || 0)) / 100;
      const toBill = earned - (sov.billed_to_date || 0);
      const margin = (sov.billed_to_date || 0) - actualCost;
      const marginPct = (sov.billed_to_date || 0) > 0 ? (margin / (sov.billed_to_date || 0)) * 100 : 0;

      return {
        sov_code: sov.sov_code,
        description: sov.description,
        category: sov.sov_category,
        scheduled_value: sov.scheduled_value || 0,
        percent_complete: sov.percent_complete || 0,
        earned,
        billed: sov.billed_to_date || 0,
        toBill,
        actualCost,
        margin,
        marginPct,
        expenseCount: sovExpenses.length
      };
    });
  }, [sovItems, expenses]);

  const filteredData = useMemo(() => {
    let data = [...reportData];

    // Filter by category
    if (filters.category !== 'all') {
      data = data.filter(item => item.category === filters.category);
    }

    // Filter by search
    if (filters.search) {
      const search = filters.search.toLowerCase();
      data = data.filter(item =>
        item.sov_code.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search)
      );
    }

    // Sort
    data.sort((a, b) => {
      let aVal, bVal;
      switch (filters.sortBy) {
        case 'code':
          aVal = a.sov_code;
          bVal = b.sov_code;
          break;
        case 'value':
          aVal = a.scheduled_value;
          bVal = b.scheduled_value;
          break;
        case 'earned':
          aVal = a.earned;
          bVal = b.earned;
          break;
        case 'margin':
          aVal = a.margin;
          bVal = b.margin;
          break;
        default:
          return 0;
      }

      const comparison = typeof aVal === 'string' 
        ? aVal.localeCompare(bVal) 
        : aVal - bVal;

      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return data;
  }, [reportData, filters]);

  const handleExportCSV = () => {
    const headers = [
      'SOV Code',
      'Description',
      'Category',
      'Scheduled Value',
      '% Complete',
      'Earned',
      'Billed',
      'To Bill',
      'Actual Cost',
      'Margin',
      'Margin %',
      'Expense Count'
    ];

    const rows = filteredData.map(item => [
      item.sov_code,
      item.description,
      item.category,
      item.scheduled_value.toFixed(2),
      item.percent_complete.toFixed(1),
      item.earned.toFixed(2),
      item.billed.toFixed(2),
      item.toBill.toFixed(2),
      item.actualCost.toFixed(2),
      item.margin.toFixed(2),
      item.marginPct.toFixed(1),
      item.expenseCount
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SOV_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Report exported to CSV');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Schedule of Values Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    let y = 40;
    doc.setFontSize(8);

    filteredData.forEach((item, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.text(`${item.sov_code}`, 14, y);
      doc.text(`${item.description}`, 35, y);
      doc.text(`$${item.scheduled_value.toLocaleString()}`, 120, y);
      doc.text(`${item.percent_complete.toFixed(1)}%`, 155, y);
      doc.text(`$${item.margin.toLocaleString()}`, 175, y);

      y += 7;
    });

    doc.save(`SOV_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Report exported to PDF');
  };

  const columns = [
    { header: 'Code', accessor: 'sov_code', render: (row) => <span className="font-mono text-xs">{row.sov_code}</span> },
    { header: 'Description', accessor: 'description', render: (row) => <span className="text-xs truncate max-w-xs">{row.description}</span> },
    { header: 'Category', accessor: 'category', render: (row) => <span className="text-xs capitalize">{row.category}</span> },
    { header: 'Value', accessor: 'scheduled_value', render: (row) => <span className="text-xs">${formatCurrency(row.scheduled_value)}</span> },
    { header: '% Done', accessor: 'percent_complete', render: (row) => <span className="text-xs">{row.percent_complete.toFixed(1)}%</span> },
    { header: 'Earned', accessor: 'earned', render: (row) => <span className="text-xs text-green-400">${formatCurrency(row.earned)}</span> },
    { header: 'Billed', accessor: 'billed', render: (row) => <span className="text-xs">${formatCurrency(row.billed)}</span> },
    { header: 'To Bill', accessor: 'toBill', render: (row) => <span className={`text-xs ${row.toBill >= 0 ? 'text-amber-400' : 'text-red-400'}`}>${formatCurrency(row.toBill)}</span> },
    { header: 'Actual Cost', accessor: 'actualCost', render: (row) => <span className="text-xs">${formatCurrency(row.actualCost)}</span> },
    { 
      header: 'Margin', 
      accessor: 'margin', 
      render: (row) => (
        <div className="text-xs">
          <span className={row.margin >= 0 ? 'text-green-400' : 'text-red-400'}>
            ${formatCurrency(row.margin)}
          </span>
          <span className="text-muted-foreground ml-1">({row.marginPct.toFixed(1)}%)</span>
        </div>
      )
    }
  ];

  const totals = filteredData.reduce((acc, item) => ({
    value: acc.value + item.scheduled_value,
    earned: acc.earned + item.earned,
    billed: acc.billed + item.billed,
    toBill: acc.toBill + item.toBill,
    cost: acc.cost + item.actualCost,
    margin: acc.margin + item.margin
  }), { value: 0, earned: 0, billed: 0, toBill: 0, cost: 0, margin: 0 });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText size={20} />
              SOV Reporting
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download size={14} className="mr-1" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download size={14} className="mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 items-center">
            <Filter size={16} className="text-muted-foreground" />
            <Input
              placeholder="Search code or description..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="max-w-xs"
            />
            <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="labor">Labor</SelectItem>
                <SelectItem value="material">Material</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="subcontract">Subcontract</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.sortBy} onValueChange={(v) => setFilters({ ...filters, sortBy: v })}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="code">Code</SelectItem>
                <SelectItem value="value">Value</SelectItem>
                <SelectItem value="earned">Earned</SelectItem>
                <SelectItem value="margin">Margin</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({ ...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
            >
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>

          {/* Summary Totals */}
          <div className="grid grid-cols-6 gap-4 p-3 bg-blue-500/5 border border-blue-500/30 rounded">
            <div>
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-sm font-bold">${formatCurrency(totals.value)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Earned</p>
              <p className="text-sm font-bold text-green-400">${formatCurrency(totals.earned)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Billed</p>
              <p className="text-sm font-bold">${formatCurrency(totals.billed)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">To Bill</p>
              <p className={`text-sm font-bold ${totals.toBill >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                ${formatCurrency(totals.toBill)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Actual Cost</p>
              <p className="text-sm font-bold">${formatCurrency(totals.cost)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Margin</p>
              <p className={`text-sm font-bold ${totals.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${formatCurrency(totals.margin)}
              </p>
            </div>
          </div>

          {/* Data Table */}
          <DataTable
            columns={columns}
            data={filteredData}
            emptyMessage="No data matches the current filters"
          />
        </CardContent>
      </Card>
    </div>
  );
}