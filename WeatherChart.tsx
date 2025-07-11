// WeatherChart.tsx
import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import {
  LineChart,
  lineDataItem,
  yAxisSides,
} from 'react-native-gifted-charts';

const CHART_COLOR = 'skyblue';

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
          <Text key={p} style={[styles.xLabel, fontStyle]}>
            {p}
          </Text>
        );
      })}
    </View>
  );
};

const customDataPoint = () => {
  return (
    <View
      style={{
        width: 15,
        height: 15,
        backgroundColor: 'white',
        borderWidth: 3,
        borderRadius: 15,
        borderColor: CHART_COLOR,
      }}
    />
  );
};

const WeatherChart: React.FC<WeatherChartProps> = ({
  temperatures,
  height = 130,
  currentTime,
}) => {
  if (!temperatures?.length) {
    return (
      <View style={[{ height }, styles.container]}>
        <Text style={styles.placeholder}>No data available</Text>
      </View>
    );
  }

  // Compute Y-axis bounds rounded to nearest 5°
  const step = 5;
  const minTemp = Math.floor(Math.min(...temperatures) / step) * step - step;
  const maxTemp = Math.ceil(Math.max(...temperatures) / step) * step;
  const noOfSteps = Math.round((maxTemp - minTemp) / step);

  // Prepare data for Gifted Charts
  const currentHour = Math.floor(currentTime);
  const data = temperatures.map((value, i) => {
    const showLabel = i % 6 === 0;
    const isCurrent = currentHour === (i + 1);
    return {
      value: value - minTemp,
      hideDataPoint: !isCurrent,
      customDataPoint: isCurrent ? customDataPoint : undefined,
      showXAxisIndex: showLabel,
      labelComponent: showLabel ? () => hourLabel(i) : () => null,
    } as lineDataItem;
  });

  const yLabels = useMemo(
    () =>
      Array.from({ length: noOfSteps + 1 }, (_, i) => `${minTemp + i * step}°`),
    [minTemp, noOfSteps, step]
  );

  console.log({ currentHour, minTemp, maxTemp, noOfSteps });

  const spacing = 10;
  const width = spacing * (temperatures.length - 1);

  return (
    <View style={[{ height }, styles.container]}>
      <LineChart
        data={data}
        height={height}
        width={width}
        // line customization
        curved
        color={CHART_COLOR}
        thickness={4}
        // area chart
        areaChart
        startFillColor={CHART_COLOR}
        startOpacity={0.8}
        endFillColor={CHART_COLOR}
        endOpacity={0.25}
        // horizontal spacing
        initialSpacing={0}
        spacing={spacing}
        endSpacing={0}
        // customize X-axis notches
        xAxisIndicesWidth={1}
        xAxisIndicesHeight={4}
        xAxisIndicesColor="#656565"
        // yAxisOffset={45}
        stepValue={step}
        noOfSections={noOfSteps}
        xAxisColor="#656565"
        // customize Y-axis
        yAxisColor="transparent"
        yAxisTextStyle={styles.yLabel}
        yAxisLabelTexts={yLabels}
        yAxisSide={yAxisSides.RIGHT}
        yAxisLabelWidth={40}
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
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center', // <-- add this
    // width: '100%',    // <-- remove or comment out this line
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
    textAlign: 'right',
  },
  placeholder: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 10,
  },
});
