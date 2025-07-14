import React, { useMemo, useState } from 'react';
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
  temperatures: number[];
  height?: number;
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
  const [viewWidth, setViewWidth] = useState<number | null>(null);

  if (!temperatures?.length) {
    return (
      <View style={[{ height }, styles.container]}>
        <Text style={styles.placeholder}>No data available</Text>
      </View>
    );
  }

  // НЕ мутируем входной props!
  const safeTemps = temperatures.length === 24
    ? [...temperatures, temperatures[temperatures.length - 1]]
    : temperatures;

  const noOfSteps = 7;
  const minValue = Math.min(...safeTemps);
  const maxValue = Math.max(...safeTemps);
  const range = maxValue - minValue;
  const step = Math.ceil(range / 4) || 1;
  const chartMin = Math.floor(minValue) - 2 * step;
  const chartMax = chartMin + step * noOfSteps;

  const currentHour = Math.round(currentTime);

  const smoothedTemps = safeTemps.map((_, i) => {
    const windowSize = 7;
    const halfWindow = Math.floor(windowSize / 2);
    let sum = 0;
    let count = 0;

    for (let j = Math.max(0, i - halfWindow); j <= Math.min(safeTemps.length - 1, i + halfWindow); j++) {
      sum += safeTemps[j];
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

  const fontScale = Math.max(1, PixelRatio.getFontScale());

  if (viewWidth === null) {
    return (
      <View
        style={[{ height }, styles.container]}
        onLayout={e => setViewWidth(e.nativeEvent.layout.width)}
      >
        <Text style={styles.placeholder}>Loading chart…</Text>
      </View>
    );
  }

  const intervals = safeTemps.length - 1;
  const spacing = Math.floor((viewWidth - Y_AXIS_LABEL_WIDTH) / intervals);
  const chartWidth = spacing * intervals + DATA_POINT_DIMS;

  return (
    <View
      style={[{ height }, styles.container]}
    >
      <LineChart
        data={data}
        height={height - 30}
        width={chartWidth}
        curved
        curvature={0.2}
        curveType={CurveType.CUBIC}
        color={CHART_COLOR}
        thickness={2}
        areaChart
        startFillColor={'#ffdd44'}
        startOpacity={0.7}
        endFillColor={CHART_COLOR}
        endOpacity={0.5}
        initialSpacing={8}
        spacing={spacing}
        endSpacing={0}
        xAxisIndicesWidth={1}
        xAxisIndicesHeight={8}
        xAxisIndicesColor="#656565"
        stepValue={step}
        noOfSections={noOfSteps}
        xAxisColor="#656565"
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
    width: '98%',
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
