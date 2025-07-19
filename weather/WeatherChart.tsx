// WeatherChart.tsx
import React, { useMemo } from 'react';
import { View, StyleSheet, Text, PixelRatio } from 'react-native';
import {
  CurveType,
  LineChart,
  lineDataItem,
  yAxisSides,
} from 'react-native-gifted-charts';
import { MadoText } from './Controls';

const CHART_COLOR = 'skyblue';
const DATA_POINT_DIMS = 16;
const Y_AXIS_LABEL_WIDTH = 30;

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

const hourLabel = (hour: number) => {
  const parts = formatHour(hour).split(' ');
  return (
    <View
      style={{
        width: 40,
        marginLeft: hour ? 10 : 0,
        flex: 1,
        flexDirection: 'row',
        alignItems: 'baseline',
      }}
    >
      {parts.map((p) => {
        const fontStyle = { fontSize: p === 'AM' || p === 'PM' ? 11 : 13 };
        return (
          <MadoText key={p} style={[styles.xLabel, fontStyle]}>
            {p}
          </MadoText>
        );
      })}
    </View>
  );
};

const customDataPoint = () => {
  return (
    <View
      style={{
        width: DATA_POINT_DIMS,
        height: DATA_POINT_DIMS,
        backgroundColor: 'white',
        borderWidth: 3,
        borderRadius: 100,
        borderColor: "#4C4C4C",
      }}
    />
  );
};

const WeatherChart: React.FC<WeatherChartProps> = ({
  temperatures,
  height = 160,
  currentTime,
}) => {
  if (!temperatures?.length) {
    return (
      <View style={[{ height }, styles.container]}>
        <Text style={styles.placeholder}>No data available</Text>
      </View>
    );
  }

  if (temperatures.length === 24) {
    temperatures = [...temperatures, temperatures[temperatures.length - 1]];
  }

  // Fixed number of Y-axis steps
  const noOfSteps = 7;
  
  // Find min/max of data
  const minValue = Math.min(...temperatures);
  const maxValue = Math.max(...temperatures);

  // Calculate step size so that (max - min) fits 4 steps, then expand to 7 steps for padding
  const range = maxValue - minValue;
  const step = Math.ceil(range / 4) || 1; // allow any integer step, minimum 1
  const chartMin = Math.floor(minValue) - 2 * step;
  const chartMax = chartMin + step * noOfSteps;

  // Prepare data for Gifted Charts
  const currentHour = Math.round(currentTime);
  
  // Create smoothed temperature values for a nice flowing curve
  const smoothedTemps = temperatures.map((_, i) => {
    const windowSize = 7; // Moderate smoothing window
    const halfWindow = Math.floor(windowSize / 2);
    let sum = 0;
    let count = 0;
    
    for (let j = Math.max(0, i - halfWindow); j <= Math.min(temperatures.length - 1, i + halfWindow); j++) {
      sum += temperatures[j];
      count++;
    }
    
    return sum / count;
  });
  
  const data = smoothedTemps.map((value, i) => {
    const showIndex = i % 6 === 0;
    const isCurrent = currentHour === i;
    return {
      value: value - chartMin,
      hideDataPoint: !isCurrent, 
      customDataPoint: isCurrent ? customDataPoint : undefined,
      dataPointHeight: DATA_POINT_DIMS,
      dataPointWidth: DATA_POINT_DIMS,
      showXAxisIndex: showIndex,
      labelComponent: showIndex && i < 24 ? () => hourLabel(i) : () => null,
    } as lineDataItem;
  });

  const yLabels = useMemo(
    () =>
      Array.from({ length: noOfSteps + 1 }, (_, i) => `${chartMin + i * step}°`),
    [chartMin, step, noOfSteps]
  );

  // Calculate chart width based on container width and set spacing accordingly
  const [viewWidth, setViewWidth] = React.useState<number>(0);

  // Use chartWidth to calculate spacing dynamically
  const intervals = temperatures.length - 1;
  const spacing = viewWidth > 0 && temperatures.length > 1
    ? Math.floor((viewWidth - Y_AXIS_LABEL_WIDTH) / intervals)
    : 10;
  const chartWidth = spacing * intervals + DATA_POINT_DIMS;

  const fontScale = Math.max(1, PixelRatio.getFontScale());
  console.log({viewWidth, chartWidth, intervals, spacing});

  return (
    <View
      style={[{ height }, styles.container]}
      onLayout={e => setViewWidth(e.nativeEvent.layout.width)}
    >
      <LineChart
        data={data}
        height={height - 30}
        width={chartWidth}
        // line customization
        curved
        curvature={0.2}
        curveType={CurveType.CUBIC}
        color={CHART_COLOR}
        thickness={2}
        // area chart
        areaChart
        startFillColor={'#ffdd44'}
        startOpacity={0.7}
        endFillColor={CHART_COLOR}
        endOpacity={0.5}
        // horizontal spacing
        initialSpacing={8}
        spacing={spacing}
        endSpacing={0}
        // customize X-axis notches
        xAxisIndicesWidth={1}
        xAxisIndicesHeight={8}
        xAxisIndicesColor="#656565"
        // yAxisOffset={45}
        stepValue={step}
        noOfSections={noOfSteps}
        xAxisColor="#656565"
        // customize Y-axis
        yAxisColor="transparent"
        yAxisTextStyle={{
          ...styles.yLabel,
          fontSize: styles.yLabel.fontSize / fontScale,
        }}
        yAxisLabelTexts={yLabels}
        yAxisSide={yAxisSides.RIGHT}
        yAxisLabelWidth={viewWidth - chartWidth}
        showVerticalLines={false}
        showYAxisIndices={false}
        // horizontal lines
        rulesType="solid"
        rulesColor="#434343"
        rulesThickness={1}
      />
    </View>
  );
};

export default WeatherChart;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: 100,
  },
  xLabel: {
    color: '#9a9a9a',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'left',
    marginTop: 0,
  },
  yLabel: {
    color: '#9a9a9a',
    fontSize: 13,
    fontWeight: '600',
    paddingLeft: 8,
  },
  placeholder: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 10,
  },
});
