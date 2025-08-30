// WeatherChart.tsx
import React from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Text as SvgText, Rect } from 'react-native-svg';

export interface WeatherChartProps {
  /** 24 hourly data values, index 0 = 00:00, index 23 = 23:00 */
  data: number[];
  /** Optional chart height */
  height?: number;
  /** Current time as hour index */
  currentTime: number;
  /** Optional location-local hour (0..23) for each data point, same length as data */
  hours?: number[];
  /** Function to format units (e.g., temperature or precipitation) */
  formatData: (value: number) => string;
  /** Whether to apply smoothing to the series (default: true) */
  smooth?: boolean;
  /** Target amplitude in Y-axis divisions: make (max-min) span exactly this many grid steps out of total steps (5). */
  amplitudeSteps?: number;
  /** If provided, force Y-axis min/max to these values (no padding). */
  fixedYDomain?: { min: number; max: number };
  /**
   * Theme for stroke and area gradient. If not provided, defaults are used.
   */
  theme?: {
    strokeColor: string;
    gradientTopColor: string;
    gradientBottomColor: string;
    gradientTopOpacity?: number;
    gradientBottomOpacity?: number;
    gradientStops?: Array<{
      offset: string | number;
      color: string;
      opacity?: number;
    }>;
    /** Optional: value-based stops; offsets will be computed from chart min/max so bands align to actual values */
    gradientValueStops?: Array<{
      value: number;
      color: string;
      opacity?: number;
    }>;
  };
  /** Тип графика: line (по умолчанию) или bar */
  chartType?: 'line' | 'bar';
  /** bar chart-specific theme */
  barTheme?: {
    barColor?: string;
    barHighlightColor?: string;
    barRadius?: number;
    gridLineColor?: string;
    axisColor?: string;
    textColor?: string;
    gradient?: {
      topColor: string;
      bottomColor: string;
      topOpacity?: number;
      bottomOpacity?: number;
      stops?: Array<{ offset: string | number; color: string; opacity?: number }>;
    };
  };
}

function formatHour(hour: number) {
  const date = new Date(0, 0, 0, hour, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric' });
}

// Helper function to create smooth curve using cubic bezier with improved control points
function createSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    // Get surrounding points for better control point calculation
    const prevPrev = points[i - 2] || prev;
    const next = points[i + 1] || curr;

    // Calculate control points using Catmull-Rom spline approach
    const tension = 0.2; // Reduced for smoother curves

    // Control point 1 (from previous point)
    const cp1x = prev.x + (curr.x - prevPrev.x) * tension;
    const cp1y = prev.y + (curr.y - prevPrev.y) * tension;

    // Control point 2 (to current point)
    const cp2x = curr.x - (next.x - prev.x) * tension;
    const cp2y = curr.y - (next.y - prev.y) * tension;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
  }

  return path;
}

// Helper function to create area path for gradient fill
function createAreaPath(
  points: { x: number; y: number }[],
  chartHeight: number,
  topPadding: number,
  chartWidth: number,
  leftPadding: number,
): string {
  if (points.length < 2) return '';

  const curvePath = createSmoothPath(points);
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const bottomY = chartHeight + topPadding;

  // Create area that spans the entire chart width at both top and bottom
  return `M ${leftPadding} ${firstPoint.y} L ${curvePath.substring(2)} L ${leftPadding + chartWidth} ${lastPoint.y} L ${
    leftPadding + chartWidth
  } ${bottomY} L ${leftPadding} ${bottomY} Z`;
}

const WeatherChart: React.FC<WeatherChartProps> = ({
  data,
  height = 160,
  currentTime,
  hours,
  formatData,
  smooth = true,
  amplitudeSteps,
  fixedYDomain,
  theme,
  chartType = 'line',
  barTheme,
}) => {
  const [viewWidth, setViewWidth] = React.useState<number>(350); // Default width
  const resolvedTheme = React.useMemo(() => ({
    strokeColor: theme?.strokeColor ?? DEFAULT_THEME.strokeColor,
    gradientTopColor: theme?.gradientTopColor ?? DEFAULT_THEME.gradientTopColor,
    gradientBottomColor: theme?.gradientBottomColor ?? DEFAULT_THEME.gradientBottomColor,
    gradientTopOpacity: theme?.gradientTopOpacity ?? DEFAULT_THEME.gradientTopOpacity,
    gradientBottomOpacity: theme?.gradientBottomOpacity ?? DEFAULT_THEME.gradientBottomOpacity,
    gradientStops: theme?.gradientStops,
    gradientValueStops: theme?.gradientValueStops,
  }), [theme]);

  // Bar chart theme
  const resolvedBarTheme = React.useMemo(() => ({
    barColor: barTheme?.barColor ?? '#4FC3F7',
    barHighlightColor: barTheme?.barHighlightColor ?? '#0288D1',
    barRadius: barTheme?.barRadius ?? 4,
    gridLineColor: barTheme?.gridLineColor ?? GRID_LINE_COLOR,
    axisColor: barTheme?.axisColor ?? AXIS_COLOR,
    textColor: barTheme?.textColor ?? TEXT_COLOR,
    gradient: {
      topColor: barTheme?.gradient?.topColor ?? '#B3E5FC',
      bottomColor: barTheme?.gradient?.bottomColor ?? '#0288D1',
      topOpacity: barTheme?.gradient?.topOpacity ?? 0.9,
      bottomOpacity: barTheme?.gradient?.bottomOpacity ?? 0.5,
      stops: barTheme?.gradient?.stops,
    },
  }), [barTheme]);


  const processedData = React.useMemo(() => {
    if (!data?.length) return null;

    // Optionally apply Gaussian smoothing for better curve quality
    const series = smooth ? data.map((_, i) => {
      const windowSize = 5; // Increased window size
      const halfWindow = Math.floor(windowSize / 2);
      let weightedSum = 0;
      let totalWeight = 0;

      for (let j = Math.max(0, i - halfWindow); j <= Math.min(data.length - 1, i + halfWindow); j++) {
        // Gaussian weight (approximate)
        const distance = Math.abs(i - j);
        const weight = Math.exp(-0.5 * Math.pow(distance / (windowSize / 3), 2));
        weightedSum += data[j] * weight;
        totalWeight += weight;
      }

      return weightedSum / totalWeight;
    }) : data;

    const minValue = Math.min(...series);
    const maxValue = Math.max(...series);
    let chartMin: number;
    let chartMax: number;
    const totalSteps = 5; // must match Y-axis labels steps
    if (fixedYDomain && Number.isFinite(fixedYDomain.min) && Number.isFinite(fixedYDomain.max) && fixedYDomain.max > fixedYDomain.min) {
      chartMin = fixedYDomain.min;
      chartMax = fixedYDomain.max;
    } else if (typeof amplitudeSteps === 'number' && amplitudeSteps > 0) {
      const amp = Math.max(1, Math.min(totalSteps, Math.floor(amplitudeSteps)));
      const delta = maxValue - minValue;
      const effectiveDelta = delta === 0 ? 1 : delta;
      // Scale overall chart range so data occupies exactly amp steps out of totalSteps
      const desiredRange = effectiveDelta * (totalSteps / amp);
      const extra = Math.max(0, desiredRange - effectiveDelta);
      const bottomPad = extra / 2;
      const topPad = extra / 2;
      chartMin = minValue - bottomPad;
      chartMax = maxValue + topPad;
    } else {
      const valueRange = maxValue - minValue;
      const padding = valueRange * 0.1; // 10% padding both sides
      chartMin = minValue - padding;
      chartMax = maxValue + padding;
    }
    const chartRange = chartMax - chartMin;

    // Handle edge case where all values are the same (chartRange = 0)
    const safeChartRange = chartRange === 0 ? 1 : chartRange;
    const safeChartMin = chartRange === 0 ? minValue - 0.5 : chartMin;
    const safeChartMax = chartRange === 0 ? maxValue + 0.5 : chartMax;

    // Create chart dimensions
    const chartWidth = viewWidth - Y_AXIS_LABEL_WIDTH - LEFT_PADDING;
    const chartHeight = height - X_AXIS_LABEL_HEIGHT - TOP_PADDING;
    const strokeWidth = 5; // Chart curve thickness
    const curveHorizontalPadding = strokeWidth / 2;
    const availableChartWidth = chartWidth - (curveHorizontalPadding * 2);
    const stepX = availableChartWidth / Math.max(1, data.length - 1);

    // Create points for the curve
    const points = series.map((value, i) => ({
      x: LEFT_PADDING + curveHorizontalPadding + (i * stepX),
      y: TOP_PADDING + (safeChartMax - value) / safeChartRange * chartHeight,
      value,
      hour: Array.isArray(hours) && Number.isFinite(hours[i] as number)
        ? (hours[i] as number)
        : i,
    }));

    // Create Y-axis labels
    const yAxisSteps = 5;
    const yLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
      const value = safeChartMax - (safeChartRange * i) / yAxisSteps; // Reverse order: start from max, go to min
      return {
  value,
        y: TOP_PADDING + (i * chartHeight) / yAxisSteps
      };
    });

    return {
      points,
      yLabels,
      chartWidth,
      chartHeight,
      minValue: safeChartMin,
      maxValue: safeChartMax,
      currentHour: Math.round(currentTime),
    };
  }, [data, viewWidth, height, currentTime, smooth, amplitudeSteps, fixedYDomain, hours]);


  if (!data?.length || !processedData) {
    return (
      <View style={[{ height }, styles.container]}>
        <Text style={styles.placeholder}>
          {!data?.length ? 'No data available' : 'Loading chart...'}
        </Text>
      </View>
    );
  }

  /*const { points, yLabels, chartWidth, chartHeight, currentHour, minValue, maxValue } = processedData;
  const svgWidth = viewWidth;
  const svgHeight = height;

  // Create paths
  const curvePath = createSmoothPath(points);
  const areaPath = createAreaPath(points, chartHeight, TOP_PADDING, chartWidth, LEFT_PADDING);*/

  // Build gradient stops: prefer value-based thresholds if provided
  const gradientStopsElements = React.useMemo(() => {
    if (!processedData) return [];

    const { minValue, maxValue } = processedData;
    const range = Math.max(1, maxValue - minValue);

    if (resolvedTheme.gradientValueStops && resolvedTheme.gradientValueStops.length > 0) {
      const mapped = resolvedTheme.gradientValueStops
        .map(s => {
          const v = Math.min(Math.max(s.value, minValue), maxValue);
          const offsetPct = ((maxValue - v) / range) * 100; // 0% at top (max), 100% at bottom (min)
          return { offset: offsetPct, color: s.color, opacity: s.opacity ?? 1 };
        })
        .sort((a, b) => a.offset - b.offset);
      return mapped.map((s, idx) => (
        <Stop key={idx} offset={`${s.offset}%`} stopColor={s.color} stopOpacity={s.opacity} />
      ));
    }
    if (resolvedTheme.gradientStops && resolvedTheme.gradientStops.length > 0) {
      return resolvedTheme.gradientStops.map((s, idx) => (
        <Stop key={idx} offset={s.offset as string | number} stopColor={s.color} stopOpacity={s.opacity ?? 1} />
      ));
    }
    return [
      <Stop key="0" offset="0%" stopColor={resolvedTheme.gradientTopColor} stopOpacity={resolvedTheme.gradientTopOpacity} />,
      <Stop key="1" offset="100%" stopColor={resolvedTheme.gradientBottomColor} stopOpacity={resolvedTheme.gradientBottomOpacity} />,
    ];
  }, [processedData, resolvedTheme]);

  if (!data?.length || !processedData) {
    return (
      <View style={[{ height }, styles.container]}>
        <Text style={styles.placeholder}>
          {!data?.length ? 'No data available' : 'Loading chart...'}
        </Text>
      </View>
    );
  }


  const { points, yLabels, chartWidth, chartHeight, currentHour, minValue, maxValue } = processedData;
  const svgWidth = viewWidth;
  const svgHeight = height;

  // Bar chart rendering logic
  if (chartType === 'bar') {
    // Bar chart domain
    const ySteps = 5;
    const rawMin = 0;
    const rawMax = Math.max(0, Math.max(...data));
    const yMin = fixedYDomain?.min ?? rawMin;
    const yMax = fixedYDomain?.max ?? (rawMax > 0 ? niceMax(rawMax) : 1);
    const yRange = Math.max(1e-6, yMax - yMin);
    const stepX = chartWidth / Math.max(1, data.length);
    const barGapRatio = 0.25;
    const barWidth = Math.max(2, stepX * (1 - barGapRatio));
    const axisY = TOP_PADDING + chartHeight;
    const gradientStops = resolvedBarTheme.gradient.stops && resolvedBarTheme.gradient.stops.length > 0
      ? resolvedBarTheme.gradient.stops.map((s, idx) => (
          <Stop key={idx} offset={s.offset as any} stopColor={s.color} stopOpacity={s.opacity ?? 1} />
        ))
      : [
          <Stop key="0" offset="0%" stopColor={resolvedBarTheme.gradient.topColor} stopOpacity={resolvedBarTheme.gradient.topOpacity ?? 0.9} />,
          <Stop key="1" offset="100%" stopColor={resolvedBarTheme.gradient.bottomColor} stopOpacity={resolvedBarTheme.gradient.bottomOpacity ?? 0.5} />,
        ];

    return (
      <View style={[{ height }, styles.container]} onLayout={e => setViewWidth(e.nativeEvent.layout.width)}>
        <Svg width={svgWidth} height={svgHeight}>
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
                stroke={resolvedBarTheme.gridLineColor}
                strokeWidth={1}
              />
              <SvgText
                x={LEFT_PADDING + chartWidth + 4}
                y={label.y + 4}
                fontSize={13}
                {...(Platform.OS === 'web' ? { fontFamily: WEB_FONT_FAMILY } : {})}
                fill={resolvedBarTheme.textColor}
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
            const isCurrent = i === Math.round(currentHour);
            const fill = isCurrent ? 'url(#barGradient)' : resolvedBarTheme.barColor;

            return (
              <Rect
                key={`bar-${i}`}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={resolvedBarTheme.barRadius}
                ry={resolvedBarTheme.barRadius}
                fill={fill}
                stroke={isCurrent ? resolvedBarTheme.barHighlightColor : 'transparent'}
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
                  stroke={resolvedBarTheme.axisColor}
                  strokeWidth={1}
                />
                <SvgText
                  x={tickX + 2}
                  y={height - 5}
                  fontSize={13}
                  {...(Platform.OS === 'web' ? { fontFamily: WEB_FONT_FAMILY } : {})}
                  fill={resolvedBarTheme.textColor}
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
            stroke={resolvedBarTheme.axisColor}
            strokeWidth={1}
          />

          {/* X-axis line */}
          <Path
            d={`M ${LEFT_PADDING} ${axisY} L ${LEFT_PADDING + chartWidth} ${axisY}`}
            stroke={resolvedBarTheme.axisColor}
            strokeWidth={1}
          />
        </Svg>
      </View>
    );
  }

  // ...existing code for line chart...
  const curvePath = createSmoothPath(points);
  const areaPath = createAreaPath(points, chartHeight, TOP_PADDING, chartWidth, LEFT_PADDING);

  return (
    <View
      style={[{ height }, styles.container]}
      onLayout={e => setViewWidth(e.nativeEvent.layout.width)}
    >
      <Svg width={svgWidth} height={svgHeight}>
        <Defs>
          <LinearGradient id="dataGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            {gradientStopsElements}
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
              {formatData(label.value)}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Area fill */}
        <Path
          d={areaPath}
          fill="url(#dataGradient)"
        />

        {/* Data curve */}
        <Path
          d={curvePath}
          fill="none"
          stroke={resolvedTheme.strokeColor}
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
          const showLabel = i % 6 === 0; // Show every 6 points (~hours)
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
// "Nice" max for bar chart axis
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
};

export default WeatherChart;

// Chart styling
const DEFAULT_THEME = {
  strokeColor: 'skyblue',
  gradientTopColor: '#ffdd44',
  gradientBottomColor: 'skyblue',
  gradientTopOpacity: 0.7,
  gradientBottomOpacity: 0.3,
};
const DATA_POINT_DIMS = 16;
const X_AXIS_LABEL_HEIGHT = 20; // Space reserved for X-axis labels at bottom
const Y_AXIS_LABEL_WIDTH = 40; // Width reserved for Y-axis labels
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
