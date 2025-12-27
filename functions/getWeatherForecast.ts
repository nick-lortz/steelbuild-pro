import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const location = payload.location || 'Chicago,US'; // Default location

    const apiKey = Deno.env.get('OPENWEATHER_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Weather API key not configured' }, { status: 500 });
    }

    // Get coordinates from location
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`;
    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();

    if (!geoData || geoData.length === 0) {
      return Response.json({ error: 'Location not found' }, { status: 404 });
    }

    const { lat, lon } = geoData[0];

    // Get 5-day forecast
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
    const forecastResponse = await fetch(forecastUrl);
    const forecastData = await forecastResponse.json();

    // Process forecast data
    const dailyForecasts = [];
    const grouped = {};

    forecastData.list.forEach(item => {
      const date = item.dt_txt.split(' ')[0];
      if (!grouped[date]) {
        grouped[date] = {
          date,
          temps: [],
          conditions: [],
          wind_speeds: [],
          precipitation: [],
        };
      }
      grouped[date].temps.push(item.main.temp);
      grouped[date].conditions.push(item.weather[0].main);
      grouped[date].wind_speeds.push(item.wind.speed);
      grouped[date].precipitation.push(item.pop * 100); // Probability of precipitation
    });

    Object.values(grouped).forEach(day => {
      const maxTemp = Math.round(Math.max(...day.temps));
      const minTemp = Math.round(Math.min(...day.temps));
      const avgWindSpeed = Math.round(day.wind_speeds.reduce((a, b) => a + b, 0) / day.wind_speeds.length);
      const maxWindSpeed = Math.round(Math.max(...day.wind_speeds));
      const avgPrecipitation = Math.round(day.precipitation.reduce((a, b) => a + b, 0) / day.precipitation.length);
      
      // Determine primary condition
      const conditionCounts = {};
      day.conditions.forEach(c => {
        conditionCounts[c] = (conditionCounts[c] || 0) + 1;
      });
      const primaryCondition = Object.keys(conditionCounts).reduce((a, b) => 
        conditionCounts[a] > conditionCounts[b] ? a : b
      );

      dailyForecasts.push({
        date: day.date,
        temp_high: maxTemp,
        temp_low: minTemp,
        avg_wind_speed: avgWindSpeed,
        max_wind_speed: maxWindSpeed,
        precipitation_chance: avgPrecipitation,
        condition: primaryCondition,
        is_high_wind: maxWindSpeed > 25, // Flag if winds exceed 25 mph
        is_storm: ['Thunderstorm', 'Rain', 'Snow'].includes(primaryCondition) && avgPrecipitation > 50,
        is_extreme_temp: maxTemp > 95 || minTemp < 20,
      });
    });

    return Response.json({
      location: geoData[0].name,
      forecasts: dailyForecasts.slice(0, 7), // Return 7 days
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});