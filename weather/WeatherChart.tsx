// WeatherChart.tsx
import React from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

export interface WeatherChartProps {
  /** 24 hourly values (temperatures or precipitation) */
  data: number[];
  /** Optional chart height */
  height?: number;
  /** Current time as hour index */
  currentTime: number;
  /** Unit for display (°C, °F, mm) */
  unit?: string;
  /** Chart title */
  title?: string;
  /** Chart color theme */
  color?: string;
}

function formatHour(hour: number) {
  const date = new Date(0, 0, 0, hour, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric' });
}

// Helper function to create smooth curve using cubic bezier
function createSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';

  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1] || curr;
    
    // Calculate control points for smooth curve
    const tension = 0.3;
    const cp1x = prev.x + (curr.x - (points[i - 2]?.x || prev.x)) * tension;
    const cp1y = prev.y + (curr.y - (points[i - 2]?.y || prev.y)) * tension;
    const cp2x = curr.x - (next.x - prev.x) * tension;
    const cp2y = curr.y - (next.y - prev.y) * tension;
    
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
  }
  
  return path;
}

// Helper function to create area path for gradient fill
function createAreaPath(points: { x: number; y: number }[], chartHeight: number, topPadding: number, chartWidth: number, leftPadding: number): string {
  if (points.length < 2) return '';
  
  const curvePath = createSmoothPath(points);
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const bottomY = chartHeight + topPadding;
  
  return `M ${leftPadding} ${firstPoint.y} L ${curvePath.substring(2)} L ${leftPadding + chartWidth} ${lastPoint.y} L ${leftPadding + chartWidth} ${bottomY} L ${leftPadding} ${bottomY} Z`;
}

const WeatherChart: React.FC<WeatherChartProps> = ({
  data,
  height = 160,
  currentTime,
  unit = '',
  title,
  color = 'skyblue'
}) => {
  // Validate and clean data
  const cleanData = React.useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.filter(val => typeof val === 'number' && !isNaN(val));
  }, [data]);

  const [viewWidth, setViewWidth] = React.useState<number>(350);
  
  // Process data
  const processedData = React.useMemo(() => {
    console.log("WeatherChart received data:", data);
    console.log("Data type:", typeof data, "Is array:", Array.isArray(data));
    
    if (!data?.length) {
      console.log("No data in WeatherChart");
      return null;
    }
    
    try {
      // Smooth the data using a simple moving average
      const smoothedData = data.map((_, i) => {
        const windowSize = 3;
        const halfWindow = Math.floor(windowSize / 2);
        let sum = 0;
        let count = 0;
        
        for (let j = Math.max(0, i - halfWindow); j <= Math.min(data.length - 1, i + halfWindow); j++) {
          sum += data[j];
          count++;
        }
        
        return sum / count;
      });
      
      console.log("Smoothed data:", smoothedData.slice(0, 5));
      
      const minValue = Math.min(...smoothedData);
      const maxValue = Math.max(...smoothedData);
      let valueRange = maxValue - minValue;
      
      // FIX: Handle zero range (when all values are the same)
      if (valueRange === 0) {
        console.log("Zero range detected, using fallback");
        valueRange = Math.abs(maxValue) || 1; // Use absolute value or default to 1
      }
      
      const padding = valueRange * 0.1;
      const chartMin = minValue - padding;
      const chartMax = maxValue + padding;
      const chartRange = chartMax - chartMin;
      
      console.log("Chart bounds:", { minValue, maxValue, chartMin, chartMax, chartRange });
      
      // Additional safety check
      if (!isFinite(chartRange) || chartRange <= 0) {
        console.error("Invalid chart range:", chartRange);
        return null;
      }
      
      // Create chart dimensions
      const chartWidth = viewWidth - Y_AXIS_LABEL_WIDTH - LEFT_PADDING;
      const chartHeight = height - X_AXIS_LABEL_HEIGHT - TOP_PADDING;
      
      console.log("Chart dimensions:", { chartWidth, chartHeight, viewWidth });
      
      if (chartWidth <= 0 || chartHeight <= 0) {
        console.error("Invalid chart dimensions");
        return null;
      }
      
      const strokeWidth = 5;
      const curveHorizontalPadding = strokeWidth / 2;
      const availableChartWidth = chartWidth - (curveHorizontalPadding * 2);
      const stepX = availableChartWidth / Math.max(1, data.length - 1);
      
      // Create points for the curve
      const points = smoothedData.map((value, i) => ({
        x: LEFT_PADDING + curveHorizontalPadding + (i * stepX),
        y: TOP_PADDING + (chartMax - value) / chartRange * chartHeight,
        value,
        hour: i
      }));
      
      // Validate points don't contain NaN
      const hasInvalidPoints = points.some(p => !isFinite(p.x) || !isFinite(p.y));
      if (hasInvalidPoints) {
        console.error("Invalid points detected");
        return null;
      }
      
      // Create Y-axis labels
      const yAxisSteps = 5;
      const yLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
        const value = chartMax - (chartRange * i) / yAxisSteps;
        return {
          value: Math.round(value * 10) / 10,
          y: TOP_PADDING + (i * chartHeight) / yAxisSteps
        };
      });
      
      return {
        points,
        yLabels,
        chartWidth,
        chartHeight,
        currentHour: Math.round(currentTime)
      };
      
    } catch (error) {
      console.error("Error in WeatherChart processedData:", error);
      return null;
    }
  }, [data, viewWidth, height, currentTime]);

  if (!data?.length || !processedData) {
    return (
      <View style={[{ height }, styles.container]}>
        <Text style={styles.placeholder}>
          {!data?.length ? 'No data available' : 'Loading chart...'}
        </Text>
      </View>
    );
  }

  const { points, yLabels, chartWidth, chartHeight, currentHour } = processedData;

  // Add validation for the path creation
  let curvePath = '';
  let areaPath = '';

  try {
    curvePath = createSmoothPath(points);
    areaPath = createAreaPath(points, chartHeight, TOP_PADDING, chartWidth, LEFT_PADDING);
    
    console.log("Path created successfully");
    // Check if paths contain NaN
    if (curvePath.includes('NaN') || areaPath.includes('NaN')) {
      console.error("NaN found in paths!");
      console.log("Curve path:", curvePath.substring(0, 100));
      console.log("Area path:", areaPath.substring(0, 100));
      console.log("Points:", points.slice(0, 3));
      throw new Error("NaN in SVG paths");
    }
  } catch (error) {
    console.error("Error creating paths:", error);
    return (
      <View style={[{ height }, styles.container]}>
        <Text style={styles.placeholder}>Chart rendering failed</Text>
      </View>
    );
  }

  const svgWidth = viewWidth;
  const svgHeight = height;

  // Determine gradient colors based on chart type
  const gradientId = title?.includes('Rain') ? 'rainGradient' : 'temperatureGradient';
  const chartColor = title?.includes('Rain') ? '#4A90E2' : color;

  return (
    <View
      style={[{ height }, styles.container]}
      onLayout={e => setViewWidth(e.nativeEvent.layout.width)}
    >
      {title && <Text style={styles.title}>{title}</Text>}
      <Svg width={svgWidth} height={svgHeight}>
        <Defs>
          <LinearGradient id="temperatureGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#ffdd44" stopOpacity="0.7" />
            <Stop offset="100%" stopColor={chartColor} stopOpacity="0.3" />
          </LinearGradient>
          <LinearGradient id="rainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#4A90E2" stopOpacity="0.7" />
            <Stop offset="100%" stopColor="#6BB6FF" stopOpacity="0.3" />
          </LinearGradient>
        </Defs>
        
        {/* Grid lines */}
        {yLabels.map((label, i) => (
          <React.Fragment key={i}>
            <Path
              d={`M ${LEFT_PADDING} ${label.y} L ${LEFT_PADDING + chartWidth} ${label.y}`}
              {...chartStyles.gridLine}
            />
            <SvgText
              x={LEFT_PADDING + chartWidth + 4}
              y={label.y + 4}
              {...chartStyles.yAxisLabel}
            >
              {label.value}{unit}
            </SvgText>
          </React.Fragment>
        ))}
        
        {/* Area fill */}
        <Path
          d={areaPath}
          fill={`url(#${gradientId})`}
        />
        
        {/* Data curve */}
        <Path
          d={curvePath}
          fill="none"
          stroke={chartColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Current time indicator */}
        {currentHour >= 0 && currentHour < points.length && (
          <Circle
            cx={LEFT_PADDING + (currentHour / (points.length - 1)) * chartWidth}
            cy={points[currentHour].y}
            r={DATA_POINT_DIMS / 2}
            fill="white"
            stroke="#4C4C4C"
            strokeWidth="3"
          />
        )}
        
        {/* X-axis labels and ticks */}
        {points.map((point, i) => {
          const showLabel = i % 6 === 0 && i < 24;
          if (!showLabel) return null;
          
          const axisY = chartHeight + TOP_PADDING;
          const tickHeight = 6;
          
          let tickX;
          if (i === 0) {
            tickX = LEFT_PADDING;
          } else {
            tickX = point.x;
          }
          
          return (
            <React.Fragment key={`hour-${i}`}>
              <Path
                d={`M ${tickX} ${axisY} L ${tickX} ${axisY - tickHeight}`}
                {...chartStyles.xAxisTick}
              />
              <SvgText
                x={tickX + 2} 
                y={svgHeight - 5} 
                {...chartStyles.xAxisLabel}
              >
                {formatHour(point.hour)}
              </SvgText>
            </React.Fragment>
          );
        })}
        
        {/* Last tick at 24:00 */}
        <Path
          d={`M ${LEFT_PADDING + chartWidth} ${chartHeight + TOP_PADDING} L ${LEFT_PADDING + chartWidth} ${chartHeight + TOP_PADDING - 6}`}
          {...chartStyles.xAxisTick}
        />
        
        {/* X-axis line */}
        <Path
          d={`M ${LEFT_PADDING} ${chartHeight + TOP_PADDING} L ${LEFT_PADDING + chartWidth} ${chartHeight + TOP_PADDING}`}
          {...chartStyles.xAxisLine}
        />
      </Svg>
    </View>
  );
};

export default WeatherChart;

// Constants (same as your original)
const DATA_POINT_DIMS = 16;
const X_AXIS_LABEL_HEIGHT = 20;
const Y_AXIS_LABEL_WIDTH = 30;
const TOP_PADDING = 10;
const LEFT_PADDING = 10;
const GRID_LINE_COLOR = '#939497';
const AXIS_COLOR = GRID_LINE_COLOR;
const TEXT_COLOR = '#9a9a9a';
const WEB_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const chartStyles = {
  gridLine: {
    stroke: GRID_LINE_COLOR, // Use the original constant
    strokeWidth: '1',        // Back to original thin lines
    // Remove strokeDasharray completely for solid lines
  },
  yAxisLabel: {
    fontSize: '11',
    fill: '#FFFFFF',
    textAnchor: 'start' as const,
    fontWeight: '600',
  },
  xAxisLabel: {
    fontSize: '11',
    fill: '#FFFFFF',
    textAnchor: 'middle' as const,
    fontWeight: '600',
  },
  title: {
    fontSize: '14',
    fill: '#FFFFFF',
    textAnchor: 'middle' as const,
    fontWeight: 'bold',
  },
  xAxisTick: {
    stroke: '#FFFFFF',
    strokeWidth: '1',
  },
  xAxisLine: {
    stroke: '#FFFFFF',
    strokeWidth: '1',
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  placeholder: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
  },
});
