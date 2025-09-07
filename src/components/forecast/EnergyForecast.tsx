import React, { useState, useEffect } from 'react';
import {
  CloudRain,
  Sun,
  Cloud,
  Snowflake,
  Zap,
  TrendingUp,
  TrendingDown,
  Thermometer,
  Droplets,
  Wind,
  Calendar,
  Target,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { forecastService } from '../../lib/forecastService';
import { weatherService, EnergyForecast } from '../../lib/weatherService';
import { format, parseISO } from 'date-fns';

const EnergyForecastComponent: React.FC = () => {
  const { profile } = useAuth();
  const [forecasts, setForecasts] = useState<EnergyForecast[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (profile) {
      loadForecasts();
    }
  }, [profile]);

  const loadForecasts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get existing forecasts first
      let userForecasts = await forecastService.getUserForecasts(profile!.id, 7);
      
      // If no recent forecasts, generate new ones
      if (userForecasts.length === 0) {
        userForecasts = await forecastService.generateEnergyForecast(profile!.id, 7);
      }

      setForecasts(userForecasts);

      // Get insights
      const forecastInsights = await forecastService.getWeatherInsights(userForecasts);
      setInsights(forecastInsights);
    } catch (err) {
      console.error('Error loading forecasts:', err);
      setError('Failed to load energy forecasts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const refreshForecasts = async () => {
    try {
      setRefreshing(true);
      const newForecasts = await forecastService.generateEnergyForecast(profile!.id, 7);
      setForecasts(newForecasts);

      const forecastInsights = await forecastService.getWeatherInsights(newForecasts);
      setInsights(forecastInsights);
    } catch (err) {
      console.error('Error refreshing forecasts:', err);
      setError('Failed to refresh forecasts. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
    const iconProps = { className: "w-5 h-5" };
    switch (condition) {
      case 'sunny': return <Sun {...iconProps} className="w-5 h-5 text-yellow-500" />;
      case 'cloudy': return <Cloud {...iconProps} className="w-5 h-5 text-gray-500" />;
      case 'rainy': return <CloudRain {...iconProps} className="w-5 h-5 text-blue-500" />;
      case 'stormy': return <CloudRain {...iconProps} className="w-5 h-5 text-purple-500" />;
      case 'snow': return <Snowflake {...iconProps} className="w-5 h-5 text-blue-300" />;
      default: return <Cloud {...iconProps} className="w-5 h-5 text-gray-500" />;
    }
  };

  const prepareChartData = () => {
    return forecasts.map(forecast => ({
      date: format(parseISO(forecast.forecast_date), 'MMM dd'),
      predicted: Number(forecast.predicted_kwh),
      baseline: forecast.weather_factors.baseline_usage,
      tempHigh: forecast.weather_factors.temperature_high,
      tempLow: forecast.weather_factors.temperature_low,
      humidity: forecast.weather_factors.humidity,
      confidence: Number(forecast.confidence_score) * 100,
      weather: forecast.weather_factors.weather_condition,
    }));
  };

  const chartData = prepareChartData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={loadForecasts}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <Zap className="w-8 h-8 text-blue-600 mr-3" />
            Energy Forecast
          </h1>
          <p className="text-gray-600">
            AI-powered energy usage predictions based on weather conditions
          </p>
        </div>
        <button
          onClick={refreshForecasts}
          disabled={refreshing}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
        >
          {refreshing ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Calendar className="w-4 h-4" />
          )}
          <span>{refreshing ? 'Updating...' : 'Refresh Forecast'}</span>
        </button>
      </div>

      {/* Insights Cards */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">7-Day Forecast</p>
                <p className="text-2xl font-bold text-gray-900">
                  {insights.totalPredictedUsage.toFixed(1)} kWh
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Avg: {(insights.totalPredictedUsage / 7).toFixed(1)} kWh/day
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Confidence</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(insights.averageConfidence * 100).toFixed(0)}%
                </p>
                <p className="text-sm text-green-500 font-medium mt-1">
                  High accuracy
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Usage Days</p>
                <p className="text-2xl font-bold text-gray-900">
                  {insights.highUsageDays}
                </p>
                <p className="text-sm text-orange-500 font-medium mt-1">
                  Above average
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Weather Impact</p>
                <p className="text-lg font-bold text-gray-900">Moderate</p>
                <p className="text-sm text-gray-500 mt-1">
                  Temperature driven
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Thermometer className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forecast Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">7-Day Energy Forecast</h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Predicted Usage</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
              <span className="text-gray-600">Baseline</span>
            </div>
          </div>
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                label={{ value: 'kWh', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: any, name: string) => [
                  `${Number(value).toFixed(1)} kWh`,
                  name === 'predicted' ? 'Predicted Usage' : 'Baseline Usage'
                ]}
              />
              <Area 
                type="monotone" 
                dataKey="predicted" 
                stroke="#3B82F6" 
                fill="url(#predictedGradient)"
                strokeWidth={3}
              />
              <Line 
                type="monotone" 
                dataKey="baseline" 
                stroke="#9CA3AF" 
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>No forecast data available</p>
              <p className="text-sm">Click "Refresh Forecast" to generate predictions</p>
            </div>
          </div>
        )}
      </div>

      {/* Daily Forecast Cards */}
      {forecasts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Daily Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {forecasts.slice(0, 7).map((forecast) => (
              <div key={forecast.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-900">
                    {format(parseISO(forecast.forecast_date), 'MMM dd')}
                  </div>
                  {getWeatherIcon(forecast.weather_factors.weather_condition)}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Usage</span>
                    <span className="font-semibold text-blue-600">
                      {Number(forecast.predicted_kwh).toFixed(1)} kWh
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Temp</span>
                    <span className="text-sm font-medium">
                      {forecast.weather_factors.temperature_high.toFixed(0)}° / {forecast.weather_factors.temperature_low.toFixed(0)}°C
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Confidence</span>
                    <span className="text-sm font-medium text-green-600">
                      {(Number(forecast.confidence_score) * 100).toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="mt-3 pt-2 border-t border-gray-100">
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Thermometer className="w-3 h-3 mr-1" />
                        {forecast.weather_factors.temperature_high.toFixed(0)}°
                      </div>
                      <div className="flex items-center">
                        <Droplets className="w-3 h-3 mr-1" />
                        {forecast.weather_factors.humidity.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {insights && insights.recommendations.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-100 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Lightbulb className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Smart Recommendations</h3>
          </div>
          
          <div className="space-y-3">
            {insights.recommendations.map((recommendation: string, index: number) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">{recommendation}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-green-200">
            <p className="text-sm text-gray-600">
              <strong>Weather Impact:</strong> {insights.weatherImpact}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnergyForecastComponent;