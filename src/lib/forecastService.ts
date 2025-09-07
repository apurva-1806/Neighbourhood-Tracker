import { supabase } from './supabase';
import { weatherService, WeatherData, EnergyForecast } from './weatherService';

class ForecastService {
  async generateEnergyForecast(userId: string, days: number = 7): Promise<EnergyForecast[]> {
    try {
      // Get user's location (you might want to store this in user profile)
      const location = await this.getUserLocation();
      const weatherForecast = await weatherService.getWeatherForecast(
        location.lat, 
        location.lon, 
        days
      );

      const forecasts: EnergyForecast[] = [];

      for (const weather of weatherForecast) {
        // Calculate forecast using the database function
        const { data: forecastData, error } = await supabase.rpc(
          'calculate_energy_forecast',
          {
            p_user_id: userId,
            p_forecast_date: weather.date,
            p_temperature_high: weather.temperatureHigh,
            p_temperature_low: weather.temperatureLow,
            p_weather_condition: weather.weatherCondition,
            p_humidity: weather.humidity,
          }
        );

        if (error) {
          console.error('Error calculating forecast:', error);
          continue;
        }

        if (forecastData && forecastData.length > 0) {
          const forecast = forecastData[0];
          
          // Store the forecast in the database
          const { data: savedForecast, error: saveError } = await supabase
            .from('energy_forecasts')
            .upsert({
              user_id: userId,
              forecast_date: weather.date,
              predicted_kwh: forecast.predicted_kwh,
              confidence_score: forecast.confidence_score,
              weather_factors: forecast.weather_factors,
            })
            .select()
            .single();

          if (saveError) {
            console.error('Error saving forecast:', saveError);
          } else if (savedForecast) {
            forecasts.push(savedForecast);
          }
        }
      }

      return forecasts;
    } catch (error) {
      console.error('Error generating energy forecast:', error);
      return [];
    }
  }

  async getUserForecasts(userId: string, days: number = 7): Promise<EnergyForecast[]> {
    try {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const { data, error } = await supabase
        .from('energy_forecasts')
        .select('*')
        .eq('user_id', userId)
        .gte('forecast_date', startDate)
        .lte('forecast_date', endDate.toISOString().split('T')[0])
        .order('forecast_date', { ascending: true });

      if (error) {
        console.error('Error fetching forecasts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user forecasts:', error);
      return [];
    }
  }

  async updateWeatherData(location: string, weatherData: WeatherData[]): Promise<void> {
    try {
      const weatherRecords = weatherData.map(weather => ({
        location,
        date: weather.date,
        temperature_high: weather.temperatureHigh,
        temperature_low: weather.temperatureLow,
        humidity: weather.humidity,
        weather_condition: weather.weatherCondition,
        wind_speed: weather.windSpeed,
      }));

      const { error } = await supabase
        .from('weather_data')
        .upsert(weatherRecords, { onConflict: 'location,date' });

      if (error) {
        console.error('Error updating weather data:', error);
      }
    } catch (error) {
      console.error('Error updating weather data:', error);
    }
  }

  private async getUserLocation(): Promise<{ lat: number; lon: number }> {
    // For demo purposes, using a default location (San Francisco)
    // In a real app, you'd get this from user profile or geolocation
    return { lat: 37.7749, lon: -122.4194 };
  }

  async getWeatherInsights(forecasts: EnergyForecast[]): Promise<{
    totalPredictedUsage: number;
    averageConfidence: number;
    highUsageDays: number;
    weatherImpact: string;
    recommendations: string[];
  }> {
    if (forecasts.length === 0) {
      return {
        totalPredictedUsage: 0,
        averageConfidence: 0,
        highUsageDays: 0,
        weatherImpact: 'No forecast data available',
        recommendations: [],
      };
    }

    const totalPredictedUsage = forecasts.reduce((sum, f) => sum + Number(f.predicted_kwh), 0);
    const averageConfidence = forecasts.reduce((sum, f) => sum + Number(f.confidence_score), 0) / forecasts.length;
    const averageUsage = totalPredictedUsage / forecasts.length;
    const highUsageDays = forecasts.filter(f => Number(f.predicted_kwh) > averageUsage * 1.2).length;

    // Analyze weather impact
    const weatherConditions = forecasts.map(f => f.weather_factors.weather_condition);
    const mostCommonWeather = this.getMostFrequent(weatherConditions);
    
    const recommendations: string[] = [];
    
    // Generate recommendations based on weather patterns
    if (weatherConditions.includes('sunny')) {
      recommendations.push('Take advantage of sunny days to use natural lighting and reduce electricity usage');
    }
    
    if (weatherConditions.includes('rainy') || weatherConditions.includes('stormy')) {
      recommendations.push('Prepare for higher indoor energy usage during rainy/stormy weather');
    }

    const hotDays = forecasts.filter(f => f.weather_factors.temperature_high > 25).length;
    const coldDays = forecasts.filter(f => f.weather_factors.temperature_low < 15).length;

    if (hotDays > 0) {
      recommendations.push(`${hotDays} hot day(s) expected - consider pre-cooling your home during off-peak hours`);
    }

    if (coldDays > 0) {
      recommendations.push(`${coldDays} cold day(s) expected - check heating system efficiency and seal drafts`);
    }

    return {
      totalPredictedUsage,
      averageConfidence,
      highUsageDays,
      weatherImpact: `Weather will be mostly ${mostCommonWeather} with ${hotDays} hot days and ${coldDays} cold days`,
      recommendations,
    };
  }

  private getMostFrequent(arr: string[]): string {
    const frequency: { [key: string]: number } = {};
    arr.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });
    return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
  }
}

export const forecastService = new ForecastService();