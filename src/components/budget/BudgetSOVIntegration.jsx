import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Link as LinkIcon } from 'lucide-react';

export default function BudgetSOVIntegration({ lineItems, sovItems, projectId }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const integrationData = useMemo(() => {
    const linkedItems = lineItems.filter(item => item.sov_item_id);
    const unlinkedItems = lineItems.filter(item => !item.sov_item_id);
    
    const sovWithBudget = sovItems.map(sov => {
      const budgetLines = lineItems.filter(item => item.sov_item_id === sov.id);
      const totalBudgeted = budgetLines.reduce((sum, item) => sum + (item.budgeted_amount || 0), 0);
      const totalActual = budgetLines.reduce((sum, item) => sum + (item.actual_amount || 0), 0);
      const totalForecast = budgetLines.reduce((sum, item) => sum + (item.forecast_amount || 0), 0);
      
      return {
        ...sov,
        budgetLines,
        totalBudgeted,
        totalActual,
        totalForecast,
        variance: sov.scheduled_value - totalBudgeted,
        hasLinks: budgetLines.length > 0
      };
    });

    return {
      linkedItems,
      unlinkedItems,
      sovWithBudget,
      linkedCount: linkedItems.length,
      unlinkedCount: unlinkedItems.length,
      totalLinkedBudget: linkedItems.reduce((sum, item) => sum + (item.budgeted_amount || 0), 0),
      totalUnlinkedBudget: unlinkedItems.reduce((sum, item) => sum + (item.budgeted_amount || 0), 0)
    };
  }, [lineItems, sovItems]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Linked Budget Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrationData.linkedCount}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {formatCurrency(integrationData.totalLinkedBudget)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unlinked Budget Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{integrationData.unlinkedCount}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {formatCurrency(integrationData.totalUnlinkedBudget)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Integration Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((integrationData.linkedCount / lineItems.length) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Items Linked to SOV
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SOV Line Items with Budget Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {integrationData.sovWithBudget.map(sov => (
              <div key={sov.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3">
                    {sov.hasLinks ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                    )}
                    <div>
                      <div className="font-medium">{sov.sov_code} - {sov.description}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        SOV Value: {formatCurrency(sov.scheduled_value)}
                        {sov.hasLinks && ` | Budget: ${formatCurrency(sov.totalBudgeted)}`}
                      </div>
                    </div>
                  </div>
                  {sov.hasLinks && (
                    <Badge variant={Math.abs(sov.variance) < 1000 ? 'default' : 'destructive'}>
                      {sov.variance > 0 ? '+' : ''}{formatCurrency(sov.variance)} variance
                    </Badge>
                  )}
                </div>

                {sov.hasLinks && (
                  <div className="ml-8 mt-3 space-y-2">
                    {sov.budgetLines.map(line => (
                      <div key={line.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                        <div className="flex items-center gap-2">
                          <LinkIcon className="w-3 h-3 text-muted-foreground" />
                          <span>{line.description}</span>
                          <Badge variant="outline" className="capitalize">{line.category}</Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(line.budgeted_amount)}</div>
                          <div className="text-xs text-muted-foreground">
                            Actual: {formatCurrency(line.actual_amount)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-medium">Total for SOV Line:</span>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(sov.totalBudgeted)}</div>
                        <div className="text-xs text-muted-foreground">
                          Forecast: {formatCurrency(sov.totalForecast)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!sov.hasLinks && (
                  <div className="ml-8 mt-2 text-sm text-muted-foreground">
                    No budget items linked to this SOV line
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {integrationData.unlinkedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Unlinked Budget Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {integrationData.unlinkedItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{item.description}</div>
                    <Badge variant="outline" className="mt-1 capitalize">{item.category}</Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{formatCurrency(item.budgeted_amount)}</div>
                    <div className="text-xs text-muted-foreground">Not linked to SOV</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}