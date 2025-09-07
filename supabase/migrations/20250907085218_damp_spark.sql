/*
  # Weather-Based Energy Forecasting Schema

  1. New Tables
    - `weather_data`
      - `id` (uuid, primary key)
      - `location` (text)
      - `date` (date)
      - `temperature_high` (decimal)
      - `temperature_low` (decimal)
      - `humidity` (decimal)
      - `weather_condition` (text)
      - `created_at` (timestamp)
    
    - `energy_forecasts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `forecast_date` (date)
      - `predicted_kwh` (decimal)
      - `confidence_score` (decimal)
      - `weather_factors` (jsonb)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their forecasts
    - Add policies for weather data access
*/

-- Create weather_data table
CREATE TABLE IF NOT EXISTS weather_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location text NOT NULL,
  date date NOT NULL,
  temperature_high decimal(5,2),
  temperature_low decimal(5,2),
  humidity decimal(5,2),
  weather_condition text,
  wind_speed decimal(5,2),
  created_at timestamptz DEFAULT now(),
  UNIQUE(location, date)
);

-- Create energy_forecasts table
CREATE TABLE IF NOT EXISTS energy_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  forecast_date date NOT NULL,
  predicted_kwh decimal(10,2) NOT NULL CHECK (predicted_kwh >= 0),
  confidence_score decimal(3,2) DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  weather_factors jsonb DEFAULT '{}',
  baseline_usage decimal(10,2) DEFAULT 0,
  temperature_adjustment decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, forecast_date)
);

-- Enable Row Level Security
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_forecasts ENABLE ROW LEVEL SECURITY;

-- Weather data policies (public read access for authenticated users)
CREATE POLICY "Authenticated users can view weather data"
  ON weather_data
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert weather data"
  ON weather_data
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Energy forecasts policies
CREATE POLICY "Users can view their own forecasts"
  ON energy_forecasts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own forecasts"
  ON energy_forecasts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own forecasts"
  ON energy_forecasts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Create function to calculate energy forecast based on weather
CREATE OR REPLACE FUNCTION calculate_energy_forecast(
  p_user_id uuid,
  p_forecast_date date,
  p_temperature_high decimal,
  p_temperature_low decimal,
  p_weather_condition text,
  p_humidity decimal DEFAULT 50
)
RETURNS TABLE(
  predicted_kwh decimal,
  confidence_score decimal,
  weather_factors jsonb
) AS $$
DECLARE
  baseline_usage decimal := 0;
  temp_adjustment decimal := 0;
  weather_multiplier decimal := 1.0;
  humidity_adjustment decimal := 0;
  final_prediction decimal;
  confidence decimal := 0.7;
BEGIN
  -- Calculate baseline usage from historical data (last 30 days average)
  SELECT COALESCE(AVG(kwh_used), 25.0) INTO baseline_usage
  FROM energy_logs
  WHERE user_id = p_user_id
    AND reading_date >= p_forecast_date - INTERVAL '30 days'
    AND reading_date < p_forecast_date;

  -- Temperature-based adjustments
  -- Assume optimal temperature range is 18-22°C (65-72°F)
  -- Higher or lower temperatures increase energy usage for heating/cooling
  IF p_temperature_high > 25 THEN -- Hot weather (cooling needed)
    temp_adjustment := (p_temperature_high - 25) * 0.8;
  ELSIF p_temperature_low < 15 THEN -- Cold weather (heating needed)
    temp_adjustment := (15 - p_temperature_low) * 1.2;
  END IF;

  -- Weather condition adjustments
  CASE p_weather_condition
    WHEN 'sunny' THEN weather_multiplier := 0.95; -- Less indoor time
    WHEN 'cloudy' THEN weather_multiplier := 1.0;
    WHEN 'rainy' THEN weather_multiplier := 1.1; -- More indoor time
    WHEN 'stormy' THEN weather_multiplier := 1.15;
    WHEN 'snow' THEN weather_multiplier := 1.2; -- Heating needs
    ELSE weather_multiplier := 1.0;
  END CASE;

  -- Humidity adjustments (high humidity increases AC usage)
  IF p_humidity > 70 THEN
    humidity_adjustment := (p_humidity - 70) * 0.02;
  END IF;

  -- Calculate final prediction
  final_prediction := (baseline_usage + temp_adjustment + humidity_adjustment) * weather_multiplier;
  
  -- Ensure minimum reasonable value
  final_prediction := GREATEST(final_prediction, baseline_usage * 0.5);

  -- Adjust confidence based on data availability
  IF baseline_usage > 0 THEN
    confidence := 0.8;
  ELSE
    confidence := 0.5; -- Lower confidence without historical data
  END IF;

  RETURN QUERY SELECT 
    final_prediction,
    confidence,
    jsonb_build_object(
      'baseline_usage', baseline_usage,
      'temperature_adjustment', temp_adjustment,
      'weather_multiplier', weather_multiplier,
      'humidity_adjustment', humidity_adjustment,
      'temperature_high', p_temperature_high,
      'temperature_low', p_temperature_low,
      'weather_condition', p_weather_condition,
      'humidity', p_humidity
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;