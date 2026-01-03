import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

export default function FinancialSummaryCards({ metrics }) {
  const variance = (metrics?.actual || 0) - (metrics?.budget || 0);
  const variancePercent = metrics?.budget ? ((variance / metrics.budget) * 100).toFixed(1) : 0;
  const isOverBudget = variance > 0;

  const cards = [
    {
      title: 'Budget',
      value: metrics?.budget || 0,
      icon: DollarSign,
      color: 'text-blue-500'
    },
    {
      title: 'Committed',
      value: metrics?.committed || 0,
      icon: DollarSign,
      color: 'text-amber-500'
    },
    {
      title: 'Actual',
      value: metrics?.actual || 0,
      icon: DollarSign,
      color: 'text-green-500'
    },
    {
      title: 'Variance',
      value: Math.abs(variance),
      icon: isOverBudget ? TrendingUp : TrendingDown,
      color: isOverBudget ? 'text-red-500' : 'text-green-500',
      subtitle: `${isOverBudget ? '+' : '-'}${Math.abs(variancePercent)}%`
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card key={idx} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-muted-foreground">{card.title}</p>
                <Icon size={16} className={card.color} />
              </div>
              <p className="text-lg font-bold">
                ${(card.value / 1000).toFixed(0)}K
              </p>
              {card.subtitle && (
                <p className={`text-xs mt-1 ${card.color}`}>{card.subtitle}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}