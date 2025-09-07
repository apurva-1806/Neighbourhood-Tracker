import axios from 'axios';

// Using OpenWeatherMap API (free tier available)
const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

export interface WeatherData {
  date: string;
  temperatureHigh: number;
  temperatureLow: number;
  humidity: number;
  weatherCondition: string;
  windSpeed: number;
  description: string;
}

export interface EnergyForecast {
  id: string;
  forecast_date: string;
  predicted_kwh: number;
  confidence_score: number;
  weather_factors: {
    baseline_usage: number;
    temperature_adjustment: number;
    weather_multiplier: number;
    humidity_adjustment: number;
    temperature_high: number;
    temperature_low: number;
    weather_condition: string;
    humidity: number;
  };
  created_at: string;
}

class WeatherService {
  private apiKey: string;

  constructor() {
    this.apiKey = WEATHER_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Weather API key not found. Using mock data for development.');
    }
  }

  async getCurrentWeather(lat: number, lon: number): Promise<WeatherData | null> {
    if (!this.apiKey) {
      return this.getMockWeatherData();
    }

    try {
      const response = await axios.get(
        `${WEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
      );

      const data = response.data;
      return {
        date: new Date().toISOString().split('T')[0],
        temperatureHigh: data.main.temp_max,
        temperatureLow: data.main.temp_min,
        humidity: data.main.humidity,
        weatherCondition: this.mapWeatherCondition(data.weather[0].main),
        windSpeed: data.wind?.speed || 0,
        description: data.weather[0].description,
      };
    } catch (error) {
      console.error('Error fetching current weather:', error);
      return this.getMockWeatherData();
    }
  }

  async getWeatherForecast(lat: number, lon: number, days: number = 7): Promise<WeatherData[]> {
    if (!this.apiKey) {
      return this.getMockForecastData(days);
    }

    try {
      const response = await axios.get(
        `${WEATHER_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
      );

      const forecasts = response.data.list;
      const dailyForecasts: { [key: string]: any } = {};

      // Group forecasts by date and find min/max temperatures
      forecasts.forEach((forecast: any) => {
        const date = forecast.dt_txt.split(' ')[0];
        if (!dailyForecasts[date]) {
          dailyForecasts[date] = {
            date,
            temps: [],
            humidity: [],
            conditions: [],
            windSpeeds: [],
          };
        }
        dailyForecasts[date].temps.push(forecast.main.temp);
        dailyForecasts[date].humidity.push(forecast.main.humidity);
        dailyForecasts[date].conditions.push(forecast.weather[0].main);
        dailyForecasts[date].windSpeeds.push(forecast.wind?.speed || 0);
      });

      return Object.values(dailyForecasts)
        .slice(0, days)
        .map((day: any) => ({
          date: day.date,
          temperatureHigh: Math.max(...day.temps),
          temperatureLow: Math.min(...day.temps),
          humidity: day.humidity.reduce((a: number, b: number) => a + b, 0) / day.humidity.length,
          weatherCondition: this.mapWeatherCondition(this.getMostFrequent(day.conditions)),
          windSpeed: day.windSpeeds.reduce((a: number, b: number) => a + b, 0) / day.windSpeeds.length,
          description: this.getMostFrequent(day.conditions).toLowerCase(),
        }));
    } catch (error) {
      console.error('Error fetching weather forecast:', error);
      return this.getMockForecastData(days);
    }
  }

  private mapWeatherCondition(condition: string): string {
    const conditionMap: { [key: string]: string } = {
      'Clear': 'sunny',
      'Clouds': 'cloudy',
      'Rain': 'rainy',
      'Drizzle': 'rainy',
      'Thunderstorm': 'stormy',
      'Snow': 'snow',
      'Mist': 'cloudy',
      'Fog': 'cloudy',
    };
    return conditionMap[condition] || 'cloudy';
  }

  private getMostFrequent(arr: string[]): string {
    const frequency: { [key: string]: number } = {};
    arr.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });
    return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
  }

  private getMockWeatherData(): WeatherData {
    return {
      date: new Date().toISOString().split('T')[0],
      temperatureHigh: 22 + Math.random() * 10,
      temperatureLow: 15 + Math.random() * 5,
      humidity: 50 + Math.random() * 30,
      weatherCondition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
      windSpeed: Math.random() * 10,
      description: 'Mock weather data',
    };
  }

  private getMockForecastData(days: number): WeatherData[] {
    const forecasts: WeatherData[] = [];
    const conditions = ['sunny', 'cloudy', 'rainy', 'stormy'];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      forecasts.push({
        date: date.toISOString().split('T')[0],
        temperatureHigh: 20 + Math.random() * 15,
        temperatureLow: 10 + Math.random() * 10,
        humidity: 40 + Math.random() * 40,
        weatherCondition: conditions[Math.floor(Math.random() * conditions.length)],
        windSpeed: Math.random() * 15,
        description: `Mock forecast for day ${i + 1}`,
      });
    }
    
    return forecasts;
  }

  async getLocationFromCoords(lat: number, lon: number): Promise<string> {
    if (!this.apiKey) {
      return `Mock Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
    }

    try {
      const response = await axios.get(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${this.apiKey}`
      );
      
      const location = response.data[0];
      return `${location.name}, ${location.country}`;
    } catch (error) {
      console.error('Error getting location:', error);
      return `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
    }
  }
}

export const weatherService = new WeatherService();