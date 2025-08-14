// WeatherBarChart.tsx
import React from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop, Text as SvgText, Path, Circle } from 'react-native-svg';

export interface WeatherBarChartProps {
  data: number[];
  height?: number;
  currentTime: number; // hour index 0..23
  formatData: (value: number) => string;
  theme?: {
    strokeColor: string;
    gradientTopColor: string;
    gradientBottomColor: string;
    gradientTopOpacity?: number;
    gradientBottomOpacity?: number;
    gradientStops?: Array<{ offset: string | number; color: string; opacity?: number }>
  };
}

const X_AXIS_LABEL_HEIGHT = 20;
const Y_AXIS_LABEL_WIDTH = 30;
const TOP_PADDING = 10;
const LEFT_PADDING = 10;
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

function formatHour(hour: number) {
  const date = new Date(0, 0, 0, hour, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric' });
}

const DEFAULT_THEME = {
  strokeColor: '#90A4AE',
  gradientTopColor: '#ECEFF1',
  gradientBottomColor: '#90A4AE',
  gradientTopOpacity: 0.9,
  gradientBottomOpacity: 0.45,
};

const WeatherBarChart: React.FC<WeatherBarChartProps> = ({ data, height = 160, currentTime, formatData, theme }) => {
  const [viewWidth, setViewWidth] = React.useState<number>(350);
  const areaGradientId = React.useMemo(() => `barArea-${Math.random().toString(36).slice(2)}` , []);

  const resolvedTheme = React.useMemo(() => ({
    strokeColor: theme?.strokeColor ?? DEFAULT_THEME.strokeColor,
    gradientTopColor: theme?.gradientTopColor ?? DEFAULT_THEME.gradientTopColor,
    gradientBottomColor: theme?.gradientBottomColor ?? DEFAULT_THEME.gradientBottomColor,
    gradientTopOpacity: theme?.gradientTopOpacity ?? DEFAULT_THEME.gradientTopOpacity,
    gradientBottomOpacity: theme?.gradientBottomOpacity ?? DEFAULT_THEME.gradientBottomOpacity,
    gradientStops: theme?.gradientStops,
  }), [theme]);

  const gradientStopsElements = React.useMemo(() => {
    if (resolvedTheme.gradientStops && resolvedTheme.gradientStops.length > 0) {
      return resolvedTheme.gradientStops.map((s, idx) => (
        <Stop key={idx} offset={s.offset as any} stopColor={s.color} stopOpacity={s.opacity ?? 1} />
      ));
    }
    return [
      <Stop key="0" offset="0%" stopColor={resolvedTheme.gradientTopColor} stopOpacity={resolvedTheme.gradientTopOpacity} />,
      <Stop key="1" offset="100%" stopColor={resolvedTheme.gradientBottomColor} stopOpacity={resolvedTheme.gradientBottomOpacity} />,
    ];
  }, [resolvedTheme]);

  const processed = React.useMemo(() => {
    if (!data?.length) return null;

    const minValue = Math.min(...data);
    const maxValue = Math.max(...data);
    const valueRange = maxValue - minValue;
    const padding = valueRange * 0.1; // 10% padding
    const chartMin = valueRange === 0 ? Math.max(0, minValue - 1) : minValue - padding;
    const chartMax = valueRange === 0 ? maxValue + 1 : maxValue + padding;
    const chartRange = chartMax - chartMin || 1;

    const chartWidth = viewWidth - Y_AXIS_LABEL_WIDTH - LEFT_PADDING;
    const chartHeight = height - X_AXIS_LABEL_HEIGHT - TOP_PADDING;
    const barGap = 2;
    const stepX = chartWidth / data.length;
    const barWidth = Math.max(1, stepX - barGap);

    const bars = data.map((value, i) => {
      const clamped = isFinite(value) ? value : 0;
      const normalized = (clamped - chartMin) / chartRange;
      const barHeight = Math.max(0, Math.min(1, normalized)) * chartHeight;
      const x = LEFT_PADDING + i * stepX + (stepX - barWidth) / 2;
      const y = TOP_PADDING + (chartHeight - barHeight);
      return { x, y, width: barWidth, height: barHeight, value: clamped, hour: i };
    });

    // Y-axis labels
    const yAxisSteps = 5;
    const yLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
      const val = chartMax - (chartRange * i) / yAxisSteps;
      return { value: Math.round(val), y: TOP_PADDING + (i * chartHeight) / yAxisSteps };
    });

    return { bars, yLabels, chartWidth, chartHeight };
  }, [data, viewWidth, height]);

  if (!data?.length || !processed) {
    return (
      <View style={[{ height }, styles.container]}>
        <Text style={styles.placeholder}>{!data?.length ? 'No data available' : 'Loading chart...'}</Text>
      </View>
    );
  }

  const { bars, yLabels, chartWidth, chartHeight } = processed;
  const svgWidth = viewWidth;
  const svgHeight = height;

  return (
    <View style={[{ height }, styles.container]} onLayout={e => setViewWidth(e.nativeEvent.layout.width)}>
      <Svg width={svgWidth} height={svgHeight}>
        <Defs>
          <LinearGradient id={areaGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            {gradientStopsElements}
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {yLabels.map((label, i) => (
          <React.Fragment key={i}>
            <Path d={`M ${LEFT_PADDING} ${label.y} L ${LEFT_PADDING + chartWidth} ${label.y}`} {...chartStyles.gridLine} />
            <SvgText x={LEFT_PADDING + chartWidth + 4} y={label.y + 4} {...chartStyles.yAxisLabel}>
              {formatData(label.value)}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Bars */}
        {bars.map((b, i) => (
          <Rect
            key={i}
            x={b.x}
            y={b.y}
            width={b.width}
            height={b.height}
            fill={`url(#${areaGradientId})`}
            rx={3}
          />
        ))}

        {/* Current bar indicator */}
        {currentTime >= 0 && currentTime < bars.length && (
          <Circle
            cx={bars[currentTime].x + bars[currentTime].width / 2}
            cy={bars[currentTime].y}
            r={6}
            fill="white"
            stroke={resolvedTheme.strokeColor}
            strokeWidth={3}
          />
        )}

        {/* X-axis labels and ticks */}
        {bars.map((b, i) => {
          const showLabel = i % 6 === 0 && i < 24;
          if (!showLabel) return null;
          const axisY = chartHeight + TOP_PADDING;
          const tickHeight = 6;
          const tickX = b.x + b.width / 2;
          return (
            <React.Fragment key={`hour-${i}`}>
              <Path d={`M ${tickX} ${axisY} L ${tickX} ${axisY - tickHeight}`} {...chartStyles.xAxisTick} />
              <SvgText x={tickX + 2} y={svgHeight - 5} {...chartStyles.xAxisLabel}>
                {formatHour(i)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Last tick at 24:00 (no label) */}
        <Path d={`M ${LEFT_PADDING + chartWidth} ${chartHeight + TOP_PADDING} L ${LEFT_PADDING + chartWidth} ${chartHeight + TOP_PADDING - 6}`} {...chartStyles.xAxisTick} />

        {/* X-axis line */}
        <Path d={`M ${LEFT_PADDING} ${chartHeight + TOP_PADDING} L ${LEFT_PADDING + chartWidth} ${chartHeight + TOP_PADDING}`} {...chartStyles.xAxisLine} />
      </Svg>
    </View>
  );
};

export default WeatherBarChart;

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
