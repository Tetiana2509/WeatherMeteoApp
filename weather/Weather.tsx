import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import WeatherNow from './WeatherNow';
import WeatherChart from './WeatherChart';

type WeatherProps = {
  height?: number;
  currentTime: number;
  temperatures?: number[];
  precipitation?: number[];
  temperatureUnit?: 'C' | 'F'; 
  onTemperatureUnitChange?: (unit: 'C' | 'F') => void; // ADD THIS
  style?: ViewStyle;
};

export default function Weather({ 
  height, 
  currentTime, 
  temperatures, 
  precipitation,
  temperatureUnit = 'C',
  onTemperatureUnitChange, // ADD THIS
  style 
}: WeatherProps) {
  const [chartType, setChartType] = useState<'temperature' | 'precipitation'>('temperature');

  // 24h temperatures fallback
  temperatures ??= [
    59, 59, 57, 57, 57, 55, 55, 57, 61, 63, 68, 72,
    75, 79, 79, 79, 79, 79, 75, 73, 68, 64, 64, 63,
    62
  ].filter(temp => !isNaN(temp));

  // Ensure precipitation exists
  precipitation = precipitation || [];

  console.log("Real precipitation from API:", precipitation);

  const hasRain = precipitation.some(val => val > 0);
  console.log("Has rain:", hasRain);

  return (
    <View style={[styles.weatherContainer, style]}>
      <View style={styles.weatherRow}>
        <WeatherNow
          icon={<MaterialIcons name="sunny" size={40} color="#FFD94B" />}
          currentTemp={temperatures[Math.floor(currentTime)]}
          highTemp={Math.max(...temperatures)}
          lowTemp={Math.min(...temperatures)}
          temperatureUnit={temperatureUnit}
        />
        <View style={styles.chartContainer}>
          {/* Chart Control Buttons */}
          <View style={styles.controlButtons}>
            {/* Chart Type Switch Button */}
            <TouchableOpacity 
              style={styles.chartSwitchButton}
              onPress={() => setChartType(chartType === 'temperature' ? 'precipitation' : 'temperature')}
            >
              <Text style={styles.chartSwitchText}>
                {chartType === 'temperature' ? '🌧️ Rain' : '🌡️ Temp'}
              </Text>
            </TouchableOpacity>

            {/* Temperature Unit Switch - Only show when displaying temperature */}
            {chartType === 'temperature' && onTemperatureUnitChange && (
              <TouchableOpacity 
                style={[styles.unitSwitchButton, temperatureUnit === 'F' && styles.unitSwitchButtonActive]}
                onPress={() => onTemperatureUnitChange(temperatureUnit === 'C' ? 'F' : 'C')}
              >
                <View style={styles.unitSwitchContainer}>
                  <Text style={[styles.unitSwitchText, temperatureUnit === 'C' && styles.unitSwitchTextActive]}>
                    °C
                  </Text>
                  <View style={[styles.unitSwitchToggle, temperatureUnit === 'F' && styles.unitSwitchToggleRight]} />
                  <Text style={[styles.unitSwitchText, temperatureUnit === 'F' && styles.unitSwitchTextActive]}>
                    °F
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Chart */}
          <WeatherChart
            data={(() => {
              const chartData = chartType === 'temperature' ? temperatures : precipitation;
              if (!chartData || chartData.length === 0) {
                return chartType === 'temperature' ? [20, 21, 22, 23, 24] : [0, 0.1, 0.2, 0.3, 0.4];
              }
              const validData = chartData.filter(val => typeof val === 'number' && isFinite(val));
              return validData.length > 0 ? validData : (chartType === 'temperature' ? [20] : [0]);
            })()}
            height={height || 160}
            currentTime={Math.max(0, Math.min(23, currentTime))}
            unit={chartType === 'temperature' ? `°${temperatureUnit}` : 'mm'}
            title={chartType === 'temperature' ? 'Temperature' : 'Rain Forecast'}
            color={chartType === 'temperature' ? 'skyblue' : '#4A90E2'}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weatherContainer: {
    marginBottom: 16
  },
  weatherRow: {
    flexDirection: 'row',
    marginLeft: 40,
    marginRight: 20,
    marginBottom: 16
  },
  chartContainer: {
    flex: 1,
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10, // Space between buttons
  },
  chartSwitchButton: {
    backgroundColor: '#555',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  chartSwitchText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // New unit switch button styles
  unitSwitchButton: {
    backgroundColor: '#444',
    borderRadius: 20,
    padding: 3,
    minWidth: 70,
  },
  unitSwitchButtonActive: {
    backgroundColor: '#555',
  },
  unitSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    height: 26,
  },
  unitSwitchText: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 1,
  },
  unitSwitchTextActive: {
    color: '#fff',
  },
  unitSwitchToggle: {
    position: 'absolute',
    left: 2,
    width: 32,
    height: 22,
    backgroundColor: '#007AFF',
    borderRadius: 11,
  },
  unitSwitchToggleRight: {
    left: 36, // Move to the right side
  },
});
