import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cloud, CloudRain, Wind, AlertTriangle, ThermometerSun } from 'lucide-react';
import { format } from 'date-fns';

export default function WeatherWidget({ projectId }) {
  const { data: weather, isLoading } = useQuery({
    queryKey: ['weather', projectId],
    queryFn: async () => {
      const { data } = await apiClient.functions.invoke('getWeatherForecast', { project_id: projectId });
      return data;
    },
    enabled: !!projectId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: 60 * 60 * 1000 // 1 hour
  });

  if (isLoading) return null;
  if (!weather) return null;

  const today = weather.forecasts[0];
  const risky = weather.forecasts.filter(f => f.severity === 'high');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Cloud size={16} />
            Weather Forecast
          </span>
          {risky.length > 0 && (
            <Badge variant="outline" className="bg-red-500/20 text-red-400">
              {risky.length} high risk days
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Today's Weather */}
        <div className="p-3 bg-secondary rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-xs text-muted-foreground">Today</p>
              <div className="flex items-center gap-2 mt-1">
                <ThermometerSun size={18} />
                <span className="text-lg font-semibold">
                  {today.temp_high}°F / {today.temp_low}°F
                </span>
              </div>
            </div>
            {!today.safe_for_erection && (
              <Badge variant="outline" className="bg-amber-500/20 text-amber-400">
                Caution
              </Badge>
            )}
          </div>
          {today.risks.length > 0 && (
            <div className="space-y-1">
              {today.risks.map((risk, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <AlertTriangle size={12} className="mt-0.5 text-amber-500" />
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 7-Day Forecast */}
        <div className="space-y-2">
          {weather.forecasts.slice(1, 4).map((day, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-secondary rounded">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-12">
                  {format(new Date(day.date), 'EEE')}
                </span>
                <div className="flex items-center gap-2 text-xs">
                  {day.precipitation_inches > 0 && <CloudRain size={14} />}
                  {day.wind_mph > 20 && <Wind size={14} />}
                  <span>{day.temp_high}°/{day.temp_low}°</span>
                </div>
              </div>
              {day.severity === 'high' ? (
                <Badge variant="outline" className="bg-red-500/20 text-red-400 text-xs">
                  High Risk
                </Badge>
              ) : day.severity === 'medium' ? (
                <Badge variant="outline" className="bg-amber-500/20 text-amber-400 text-xs">
                  Caution
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-green-500/20 text-green-400 text-xs">
                  Clear
                </Badge>
              )}
            </div>
          ))}
        </div>

        <div className="text-[10px] text-muted-foreground">
          {weather.location} • Updated {format(new Date(), 'h:mm a')}
        </div>
      </CardContent>
    </Card>
  );
}