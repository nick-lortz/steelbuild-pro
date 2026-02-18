import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { redactPII } from './_lib/redact.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id } = await req.json();
    
    const project = await base44.entities.Project.list().then(p => p.find(pr => pr.id === project_id));
    const location = project?.location || 'Phoenix, AZ';
    
    // Redact any PII from location string
    const safeLocation = redactPII(location);

    // Use weather API (Open-Meteo - free, no API key, minimal data exposure)
    const geocodeResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(safeLocation)}&count=1&language=en&format=json`
    );
    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData.results?.[0]) {
      return Response.json({ error: 'Location not found' }, { status: 404 });
    }

    const { latitude, longitude, name } = geocodeData.results[0];

    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max,weathercode&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=7`
    );
    const weatherData = await weatherResponse.json();

    // Analyze weather risks for construction
    const forecasts = weatherData.daily.time.map((date, i) => {
      const temp_high = weatherData.daily.temperature_2m_max[i];
      const temp_low = weatherData.daily.temperature_2m_min[i];
      const precip = weatherData.daily.precipitation_sum[i];
      const precip_prob = weatherData.daily.precipitation_probability_max[i];
      const wind = weatherData.daily.windspeed_10m_max[i];
      const weathercode = weatherData.daily.weathercode[i];

      // Risk assessment for steel erection
      const risks = [];
      let severity = 'low';

      if (temp_high > 105 || temp_low < 32) {
        risks.push('Extreme temperature - worker safety concern');
        severity = 'high';
      }
      if (precip > 0.5 || precip_prob > 70) {
        risks.push('Heavy rain - delays likely, crane operations unsafe');
        severity = severity === 'high' ? 'high' : 'medium';
      }
      if (wind > 25) {
        risks.push('High winds - crane lifts unsafe, erection delays');
        severity = 'high';
      }
      if (weathercode >= 71 && weathercode <= 77) {
        risks.push('Snow - site access issues, delays expected');
        severity = 'high';
      }

      return {
        date,
        temp_high,
        temp_low,
        precipitation_inches: precip,
        precipitation_probability: precip_prob,
        wind_mph: wind,
        weathercode,
        risks,
        severity,
        safe_for_erection: risks.length === 0 && wind < 20
      };
    });

    return Response.json({
      location: name,
      coordinates: { latitude, longitude },
      forecasts,
      summary: {
        risky_days: forecasts.filter(f => f.severity === 'high').length,
        caution_days: forecasts.filter(f => f.severity === 'medium').length,
        safe_days: forecasts.filter(f => f.safe_for_erection).length
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});