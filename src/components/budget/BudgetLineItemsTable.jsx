import React, { useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, Search, TrendingUp, TrendingDown } from 'lucide-react';

export default function BudgetLineItemsTable({ lineItems, costCodes, onEdit, onDelete }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getCostCodeName = (costCodeId) => {
    const cc = costCodes.find(c => c.id === costCodeId);
    return cc ? `${cc.code} - ${cc.name}` : '-';
  };

  const filteredItems = useMemo(() => {
    return lineItems.filter(item => {
      const matchesSearch = !searchTerm || 
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCostCodeName(item.cost_code_id).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [lineItems, searchTerm, categoryFilter, costCodes]);

  const columns = [
    {
      key: 'description',
      label: 'Description',
      render: (item) => (
        <div>
          <div className="font-medium">{item.description}</div>
          <div className="text-xs text-muted-foreground">{getCostCodeName(item.cost_code_id)}</div>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      render: (item) => (
        <Badge variant="outline" className="capitalize">
          {item.category}
        </Badge>
      )
    },
    {
      key: 'quantity',
      label: 'Quantity',
      render: (item) => (
        <div className="text-sm">
          {item.quantity ? `${item.quantity} ${item.unit || ''}` : '-'}
        </div>
      )
    },
    {
      key: 'budgeted_amount',
      label: 'Budgeted',
      render: (item) => (
        <div className="font-medium">{formatCurrency(item.budgeted_amount)}</div>
      )
    },
    {
      key: 'committed_amount',
      label: 'Committed',
      render: (item) => (
        <div className="text-sm">{formatCurrency(item.committed_amount)}</div>
      )
    },
    {
      key: 'actual_amount',
      label: 'Actual',
      render: (item) => (
        <div>
          <div className="text-sm font-medium">{formatCurrency(item.actual_amount)}</div>
          <div className="text-xs text-muted-foreground">
            {item.budgeted_amount ? `${((item.actual_amount / item.budgeted_amount) * 100).toFixed(0)}%` : '0%'}
          </div>
        </div>
      )
    },
    {
      key: 'forecast_amount',
      label: 'Forecast',
      render: (item) => (
        <div>
          <div className="text-sm font-medium">{formatCurrency(item.forecast_amount)}</div>
          {item.budgeted_amount && item.forecast_amount && (
            <div className={`text-xs flex items-center gap-1 ${
              item.forecast_amount > item.budgeted_amount ? 'text-red-600' : 'text-green-600'
            }`}>
              {item.forecast_amount > item.budgeted_amount ? 
                <TrendingUp className="w-3 h-3" /> : 
                <TrendingDown className="w-3 h-3" />
              }
              {formatCurrency(Math.abs(item.forecast_amount - item.budgeted_amount))}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(item)}
          >
            <Pencil size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-400 hover:text-red-300"
            onClick={() => onDelete(item)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search line items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
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
      </div>

      <DataTable 
        data={filteredItems}
        columns={columns}
        emptyMessage="No budget line items found. Add line items to start tracking costs."
      />

      {filteredItems.length > 0 && (
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {filteredItems.length} line item(s)
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Total Budgeted:</span>
              <span className="font-bold ml-2">
                {formatCurrency(filteredItems.reduce((sum, item) => sum + (item.budgeted_amount || 0), 0))}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Actual:</span>
              <span className="font-bold ml-2">
                {formatCurrency(filteredItems.reduce((sum, item) => sum + (item.actual_amount || 0), 0))}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Forecast:</span>
              <span className="font-bold ml-2">
                {formatCurrency(filteredItems.reduce((sum, item) => sum + (item.forecast_amount || 0), 0))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}