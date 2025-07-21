// WeatherChart.tsx
import React from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

export interface WeatherChartProps {
  /** 24 hourly temperatures, index 0 = 00:00, index 23 = 23:00 */
  temperatures: number[];
  /** Optional chart height */
  height?: number;
  /** Current time as hour index */
  currentTime: number;
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
  
  // Create area that spans the entire chart width at both top and bottom
  return `M ${leftPadding} ${firstPoint.y} L ${curvePath.substring(2)} L ${leftPadding + chartWidth} ${lastPoint.y} L ${leftPadding + chartWidth} ${bottomY} L ${leftPadding} ${bottomY} Z`;
}

const WeatherChart: React.FC<WeatherChartProps> = ({
  temperatures,
  height = 160,
  currentTime,
}) => {
  const [viewWidth, setViewWidth] = React.useState<number>(350); // Default width
  
  // Process temperature data
  const processedData = React.useMemo(() => {
    if (!temperatures?.length) return null;
    
    // Smooth the temperatures using a simple moving average
    const smoothedTemps = temperatures.map((_, i) => {
      const windowSize = 3;
      const halfWindow = Math.floor(windowSize / 2);
      let sum = 0;
      let count = 0;
      
      for (let j = Math.max(0, i - halfWindow); j <= Math.min(temperatures.length - 1, i + halfWindow); j++) {
        sum += temperatures[j];
        count++;
      }
      
      return sum / count;
    });
    
    const minTemp = Math.min(...smoothedTemps);
    const maxTemp = Math.max(...smoothedTemps);
    const tempRange = maxTemp - minTemp;
    const padding = tempRange * 0.1; // 10% padding
    const chartMin = minTemp - padding;
    const chartMax = maxTemp + padding;
    const chartRange = chartMax - chartMin;
    
    // Create chart dimensions
    const chartWidth = viewWidth - Y_AXIS_LABEL_WIDTH - LEFT_PADDING;
    const chartHeight = height - X_AXIS_LABEL_HEIGHT - TOP_PADDING;
    const strokeWidth = 5; // Chart curve thickness
    const curveHorizontalPadding = strokeWidth / 2;
    const availableChartWidth = chartWidth - (curveHorizontalPadding * 2);
    const stepX = availableChartWidth / Math.max(1, temperatures.length - 1);
    
    // Create points for the curve
    const points = smoothedTemps.map((temp, i) => ({
      x: LEFT_PADDING + curveHorizontalPadding + (i * stepX),
      y: TOP_PADDING + (chartMax - temp) / chartRange * chartHeight,
      temp,
      hour: i
    }));
    
    // Create Y-axis labels
    const yAxisSteps = 5;
    const yLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
      const value = chartMax - (chartRange * i) / yAxisSteps; // Reverse order: start from max, go to min
      return {
        value: Math.round(value),
        y: TOP_PADDING + (i * chartHeight) / yAxisSteps
      };
    });
    
    return {
      points,
      yLabels,
      chartWidth,
      chartHeight,
      minTemp: chartMin,
      maxTemp: chartMax,
      currentHour: Math.round(currentTime)
    };
  }, [temperatures, viewWidth, height, currentTime]);

  if (!temperatures?.length || !processedData) {
    return (
      <View style={[{ height }, styles.container]}>
        <Text style={styles.placeholder}>
          {!temperatures?.length ? 'No data available' : 'Loading chart...'}
        </Text>
      </View>
    );
  }

  const { points, yLabels, chartWidth, chartHeight, currentHour } = processedData;
  const svgWidth = viewWidth;
  const svgHeight = height;

  // Create paths
  const curvePath = createSmoothPath(points);
  const areaPath = createAreaPath(points, chartHeight, TOP_PADDING, chartWidth, LEFT_PADDING);

  return (
    <View
      style={[{ height }, styles.container]}
      onLayout={e => setViewWidth(e.nativeEvent.layout.width)}
    >
      <Svg width={svgWidth} height={svgHeight}>
        <Defs>
          <LinearGradient id="temperatureGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#ffdd44" stopOpacity="0.7" />
            <Stop offset="100%" stopColor={CHART_COLOR} stopOpacity="0.3" />
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
              {label.value}°
            </SvgText>
          </React.Fragment>
        ))}
        
        {/* Area fill */}
        <Path
          d={areaPath}
          fill="url(#temperatureGradient)"
        />
        
        {/* Temperature curve */}
        <Path
          d={curvePath}
          fill="none"
          stroke={CHART_COLOR}
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
          const showLabel = i % 6 === 0 && i < 24; // Show every 6 hours (0, 6, 12, 18)
          if (!showLabel) return null;
          
          const axisY = chartHeight + TOP_PADDING;
          const tickHeight = 6;
          
          // Position ticks at gradient boundaries for first, curve points for middle
          let tickX;
          if (i === 0) {
            tickX = LEFT_PADDING; // First tick at gradient start
          } else {
            tickX = point.x; // All other ticks follow curve points
          }
          
          return (
            <React.Fragment key={`hour-${i}`}>
              {/* Tick mark */}
              <Path
                d={`M ${tickX} ${axisY} L ${tickX} ${axisY - tickHeight}`}
                {...chartStyles.xAxisTick}
              />
              {/* Label - left aligned with tick */}
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
        
        {/* Last tick at 24:00 (midnight) - no label */}
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

// Chart styling

const CHART_COLOR = 'skyblue';
const DATA_POINT_DIMS = 16;
const X_AXIS_LABEL_HEIGHT = 20; // Space reserved for X-axis labels at bottom
const Y_AXIS_LABEL_WIDTH = 30; // Width reserved for Y-axis labels
const TOP_PADDING = 10; // Padding at the top of the chart
const LEFT_PADDING = 10; // Padding at the left of the chart
const GRID_LINE_COLOR = '#939497';
const AXIS_COLOR = GRID_LINE_COLOR;
const TEXT_COLOR = '#9a9a9a';
const WEB_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const chartStyles = {
  yAxisLabel: {
    fontSize: '13',
    ...(Platform.OS === 'web' && { fontFamily: WEB_FONT_FAMILY }),
    fill: TEXT_COLOR,
    textAnchor: 'start' as const,
  },
  xAxisLabel: {
    fontSize: '13',
    ...(Platform.OS === 'web' && { fontFamily: WEB_FONT_FAMILY }),
    fill: TEXT_COLOR,
    textAnchor: 'start' as const,
  },
  gridLine: {
    stroke: GRID_LINE_COLOR,
    strokeWidth: '1',
  },
  xAxisLine: {
    stroke: AXIS_COLOR,
    strokeWidth: '1',
  },
  xAxisTick: {
    stroke: AXIS_COLOR,
    strokeWidth: '1',
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  placeholder: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
  },
});
