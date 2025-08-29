import React from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import Svg, { Rect, Path, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

type GradientStops = { offset: string | number; color: string; opacity?: number };
type GradientConfig = {
  topColor: string;
  bottomColor: string;
  topOpacity?: number;
  bottomOpacity?: number;
  stops?: GradientStops[];
};

type ResolvedTheme = {
  barColor: string;
  barHighlightColor: string;
  barRadius: number;
  gridLineColor: string;
  axisColor: string;
  textColor: string;
  gradient: GradientConfig;
};

export type RainBarChartProps = {
  data: number[]; // 24 hourly values (mm)
  height?: number;
  currentTime: number; // index of current hour
  hours?: number[]; // optional local hours 0..23
  formatData: (value: number) => string; // formatter for y-axis labels
  /** Optional: force Y domain */
  fixedYDomain?: { min: number; max: number };
  /** Optional theme overrides */
  theme?: {
    barColor?: string;
    barHighlightColor?: string;
    barRadius?: number;
    gridLineColor?: string;
    axisColor?: string;
    textColor?: string;
    gradient?: GradientConfig;
  };
};

const X_AXIS_LABEL_HEIGHT = 20;
const Y_AXIS_LABEL_WIDTH = 45;
const TOP_PADDING = 10;
const LEFT_PADDING = 10;
const WEB_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const DEFAULT_THEME: ResolvedTheme = {
  barColor: '#4FC3F7',
  barHighlightColor: '#0288D1',
  barRadius: 4,
  gridLineColor: '#939497',
  axisColor: '#939497',
  textColor: '#9a9a9a',
  gradient: {
    topColor: '#B3E5FC',
    bottomColor: '#0288D1',
    topOpacity: 0.9,
    bottomOpacity: 0.5,
  },
};

function formatHour(hour: number) {
  const date = new Date(0, 0, 0, hour, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric' });
}

// Choose a nice upper bound for the y-axis (1, 2, 5, 10, 20, 50, 100, ...)
function niceMax(value: number) {
  if (!isFinite(value) || value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  const n = value / base;
  if (n <= 1) return 1 * base;
  if (n <= 2) return 2 * base;
  if (n <= 5) return 5 * base;
  return 10 * base;
}

const RainBarChart: React.FC<RainBarChartProps> = ({
  data,
  height = 160,
  currentTime,
  hours,
  formatData,
  fixedYDomain,
  theme,
}) => {
  const [viewWidth, setViewWidth] = React.useState<number>(350);

  const t: ResolvedTheme = React.useMemo(() => ({
    barColor: theme?.barColor ?? DEFAULT_THEME.barColor,
    barHighlightColor: theme?.barHighlightColor ?? DEFAULT_THEME.barHighlightColor,
    barRadius: theme?.barRadius ?? DEFAULT_THEME.barRadius,
    gridLineColor: theme?.gridLineColor ?? DEFAULT_THEME.gridLineColor,
    axisColor: theme?.axisColor ?? DEFAULT_THEME.axisColor,
    textColor: theme?.textColor ?? DEFAULT_THEME.textColor,
    gradient: { ...DEFAULT_THEME.gradient, ...(theme?.gradient ?? {}) },
  }), [theme]);

  if (!data || data.length === 0) {
    return (
      <View style={[{ height }, styles.container]}>
        <Text style={styles.placeholder}>No data available</Text>
      </View>
    );
  }

  const chartWidth = viewWidth - Y_AXIS_LABEL_WIDTH - LEFT_PADDING;
  const chartHeight = height - X_AXIS_LABEL_HEIGHT - TOP_PADDING;
  const ySteps = 5;

  // Domain
  const rawMin = 0; // precipitation can't be negative (already clamped by caller)
  const rawMax = Math.max(0, Math.max(...data));
  const yMin = fixedYDomain?.min ?? rawMin;
  const yMax = fixedYDomain?.max ?? (rawMax > 0 ? niceMax(rawMax) : 1);
  const yRange = Math.max(1e-6, yMax - yMin);

  // Geometry
  const stepX = chartWidth / Math.max(1, data.length);
  const barGapRatio = 0.25; // gap portion of stepX
  const barWidth = Math.max(2, stepX * (1 - barGapRatio));

  // Y labels and grid
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
    const value = yMax - (yRange * i) / ySteps;
    return {
      value,
      y: TOP_PADDING + (i * chartHeight) / ySteps,
    };
  });

  // X axis line Y
  const axisY = TOP_PADDING + chartHeight;

  // Gradient stops
  const gradientStops = t.gradient.stops && t.gradient.stops.length > 0
    ? t.gradient.stops.map((s: GradientStops, idx: number) => (
        <Stop key={idx} offset={s.offset as any} stopColor={s.color} stopOpacity={s.opacity ?? 1} />
      ))
    : [
        <Stop key="0" offset="0%" stopColor={t.gradient.topColor} stopOpacity={t.gradient.topOpacity ?? 0.9} />,
        <Stop key="1" offset="100%" stopColor={t.gradient.bottomColor} stopOpacity={t.gradient.bottomOpacity ?? 0.5} />,
      ];

  return (
    <View
      style={[{ height }, styles.container]}
      onLayout={(e) => setViewWidth(e.nativeEvent.layout.width)}
    >
      <Svg width={viewWidth} height={height}>
        <Defs>
          <LinearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            {gradientStops}
          </LinearGradient>
        </Defs>

        {/* Grid lines + Y labels */}
        {yLabels.map((label, i) => (
          <React.Fragment key={`grid-${i}`}>
            <Path
              d={`M ${LEFT_PADDING} ${label.y} L ${LEFT_PADDING + chartWidth} ${label.y}`}
              stroke={t.gridLineColor}
              strokeWidth={1}
            />
            <SvgText
              x={LEFT_PADDING + chartWidth + 4}
              y={label.y + 4}
              fontSize={13}
              {...(Platform.OS === 'web' ? { fontFamily: WEB_FONT_FAMILY } : {})}
              fill={t.textColor}
              textAnchor="start"
            >
              {formatData(label.value)}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Bars */}
        {data.map((v, i) => {
          const safeV = typeof v === 'number' && isFinite(v) ? Math.max(0, v) : 0;
          const barHeight = Math.max(0, Math.min(1, (safeV - yMin) / yRange)) * chartHeight;
          const x = LEFT_PADDING + i * stepX + (stepX - barWidth) / 2;
          const y = axisY - barHeight;
          const isCurrent = i === Math.round(currentTime);
          const fill = isCurrent ? 'url(#barGradient)' : t.barColor;

          return (
            <Rect
              key={`bar-${i}`}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={t.barRadius}
              ry={t.barRadius}
              fill={fill}
              stroke={isCurrent ? t.barHighlightColor : 'transparent'}
              strokeWidth={isCurrent ? 2 : 0}
            />
          );
        })}

        {/* X-axis ticks and labels (every 6 hours) */}
        {data.map((_, i) => {
          if (i % 6 !== 0) return null;
          const tickX = LEFT_PADDING + i * stepX + stepX / 2;
          return (
            <React.Fragment key={`tick-${i}`}>
              <Path
                d={`M ${tickX} ${axisY} L ${tickX} ${axisY - 6}`}
                stroke={t.axisColor}
                strokeWidth={1}
              />
              <SvgText
                x={tickX + 2}
                y={height - 5}
                fontSize={13}
                {...(Platform.OS === 'web' ? { fontFamily: WEB_FONT_FAMILY } : {})}
                fill={t.textColor}
                textAnchor="start"
              >
                {formatHour(Array.isArray(hours) && isFinite(hours[i] as number) ? (hours![i] as number) : i)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Last tick at end */}
        <Path
          d={`M ${LEFT_PADDING + chartWidth} ${axisY} L ${LEFT_PADDING + chartWidth} ${axisY - 6}`}
          stroke={t.axisColor}
          strokeWidth={1}
        />

        {/* X-axis line */}
        <Path
          d={`M ${LEFT_PADDING} ${axisY} L ${LEFT_PADDING + chartWidth} ${axisY}`}
          stroke={t.axisColor}
          strokeWidth={1}
        />
      </Svg>
    </View>
  );
};

export default RainBarChart;

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
