import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Cloud, CloudRain, Wind, Snowflake, Sun, CloudDrizzle } from 'lucide-react';
import { format } from 'date-fns';

export default function WeatherWidget({ tasks, projectLocation }) {
  const { data: weatherData, isLoading, error } = useQuery({
    queryKey: ['weather', projectLocation],
    queryFn: async () => {
      const response = await base44.functions.invoke('getWeatherForecast', { 
        location: projectLocation || 'Chicago,US' 
      });
      return response.data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    enabled: !!projectLocation,
    retry: 1,
  });

  // Detect weather conflicts with upcoming outdoor tasks
  const weatherConflicts = useMemo(() => {
    if (!weatherData || !tasks) return [];

    const conflicts = [];
    const outdoorPhases = ['erection', 'delivery'];
    const outdoorKeywords = ['erect', 'steel', 'install', 'crane', 'lift', 'outdoor', 'exterior'];

    weatherData.forecasts.forEach(forecast => {
      const forecastDate = new Date(forecast.date + 'T00:00:00');

      tasks.forEach(task => {
        if (!task.start_date || !task.end_date) return;
        const taskStart = new Date(task.start_date + 'T00:00:00');
        const taskEnd = new Date(task.end_date + 'T00:00:00');

        // Check if forecast date is within task range
        if (forecastDate >= taskStart && forecastDate <= taskEnd) {
          const isOutdoorTask = 
            outdoorPhases.includes(task.phase) ||
            outdoorKeywords.some(keyword => task.name.toLowerCase().includes(keyword));

          if (isOutdoorTask) {
            const risks = [];
            
            if (forecast.is_high_wind) {
              risks.push(`High winds (${forecast.max_wind_speed} mph)`);
            }
            if (forecast.is_storm) {
              risks.push(`Storm warning (${forecast.precipitation_chance}% precip)`);
            }
            if (forecast.is_extreme_temp) {
              risks.push(`Extreme temperature (${forecast.temp_low}°F - ${forecast.temp_high}°F)`);
            }

            if (risks.length > 0) {
              conflicts.push({
                task,
                forecast,
                risks,
                severity: forecast.is_high_wind || forecast.is_storm ? 'high' : 'medium',
              });
            }
          }
        }
      });
    });

    return conflicts;
  }, [weatherData, tasks]);

  const getWeatherIcon = (condition) => {
    const iconMap = {
      Clear: Sun,
      Clouds: Cloud,
      Rain: CloudRain,
      Drizzle: CloudDrizzle,
      Snow: Snowflake,
      Thunderstorm: CloudRain,
    };
    return iconMap[condition] || Cloud;
  };

  if (isLoading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Cloud size={18} />
            Weather Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-500">Loading weather data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            Weather Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-red-400 text-sm font-medium">Failed to load weather data</p>
          <p className="text-zinc-400 text-xs">{error.message}</p>
          <p className="text-zinc-500 text-xs mt-2">
            Set OPENWEATHER_API_KEY in Settings → Environment Variables.
            <br />
            Get a free key at: openweathermap.org/api
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!weatherData) {
    return null;
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Cloud size={18} />
          Weather Forecast - {weatherData.location}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weather Conflicts Alert */}
        {weatherConflicts.length > 0 && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle size={18} className="text-red-400 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">
                  {weatherConflicts.length} Task Weather Conflict{weatherConflicts.length !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  Outdoor tasks scheduled during adverse weather conditions
                </p>
              </div>
            </div>
            <div className="space-y-2 mt-3">
              {weatherConflicts.slice(0, 3).map((conflict, idx) => (
                <div key={idx} className="p-2 bg-zinc-800 rounded text-sm">
                  <p className="text-white font-medium">{conflict.task.name}</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {format(new Date(conflict.forecast.date + 'T00:00:00'), 'MMM d')} - {conflict.risks.join(', ')}
                  </p>
                </div>
              ))}
              {weatherConflicts.length > 3 && (
                <p className="text-xs text-zinc-500 text-center">
                  +{weatherConflicts.length - 3} more conflict{weatherConflicts.length - 3 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 7-Day Forecast */}
        <div className="space-y-2">
          <p className="text-sm text-zinc-400 font-medium">7-Day Forecast</p>
          <div className="space-y-2">
            {weatherData.forecasts.map((forecast, idx) => {
              const WeatherIcon = getWeatherIcon(forecast.condition);
              const hasRisk = forecast.is_high_wind || forecast.is_storm || forecast.is_extreme_temp;

              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded ${
                    hasRisk ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-sm text-zinc-400">
                      {format(new Date(forecast.date + 'T00:00:00'), 'EEE, MMM d')}
                    </div>
                    <WeatherIcon size={18} className="text-zinc-400" />
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm">
                        {forecast.temp_high}° / {forecast.temp_low}°F
                      </span>
                      {forecast.avg_wind_speed > 15 && (
                        <div className="flex items-center gap-1 text-xs text-amber-400">
                          <Wind size={12} />
                          {forecast.max_wind_speed} mph
                        </div>
                      )}
                      {forecast.precipitation_chance > 40 && (
                        <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                          {forecast.precipitation_chance}% rain
                        </Badge>
                      )}
                    </div>
                  </div>
                  {hasRisk && (
                    <AlertTriangle size={14} className="text-amber-400" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}