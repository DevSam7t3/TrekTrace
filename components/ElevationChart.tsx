import Colors from '@/constants/Colors';
import { TrackPoint } from '@/database';
import React from 'react';
import { Dimensions, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

type ElevationChartProps = {
  trackPoints: TrackPoint[];
  style?: any;
};

export default function ElevationChart({ trackPoints, style }: ElevationChartProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  // Prepare data for the chart
  const chartData = React.useMemo(() => {
    if (!trackPoints || trackPoints.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [0] }],
      };
    }
    
    // If we have many track points, sample them to keep the chart readable
    const maxSamples = 50;
    let sampledPoints = trackPoints;
    
    if (trackPoints.length > maxSamples) {
      const sampleRate = Math.floor(trackPoints.length / maxSamples);
      sampledPoints = trackPoints.filter((_, index) => index % sampleRate === 0);
      // Ensure we include the last point
      if (sampledPoints[sampledPoints.length - 1] !== trackPoints[trackPoints.length - 1]) {
        sampledPoints.push(trackPoints[trackPoints.length - 1]);
      }
    }
    
    // Calculate distances for the x-axis
    const distances: number[] = [0];
    let totalDistance = 0;
    
    for (let i = 1; i < sampledPoints.length; i++) {
      const prevPoint = sampledPoints[i - 1];
      const currPoint = sampledPoints[i];
      
      // Simple distance calculation (Haversine would be more accurate)
      const lat1 = prevPoint.latitude;
      const lon1 = prevPoint.longitude;
      const lat2 = currPoint.latitude;
      const lon2 = currPoint.longitude;
      
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      totalDistance += distance;
      distances.push(totalDistance);
    }
    
    // Calculate labels for x-axis (in km, shown every few points)
    const labelCount = 5;
    const labelStep = Math.floor(distances.length / labelCount);
    const labels = distances
      .filter((_, i) => i % labelStep === 0 || i === distances.length - 1)
      .map(d => `${d.toFixed(1)}`);
    
    // Prepare altitude data
    const altitudes = sampledPoints.map(p => p.altitude || 0);
    
    return {
      labels,
      datasets: [{ data: altitudes }],
    };
  }, [trackPoints]);
  
  // If no data, show placeholder
  if (!trackPoints || trackPoints.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }, style]}>
        <Text style={{ color: colors.secondaryText }}>No elevation data available</Text>
      </View>
    );
  }
  
  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(45, 106, 79, ${opacity})`,
    labelColor: (opacity = 1) => colors.secondaryText,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '0',
    },
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.card }, style]}>
      <Text style={[styles.title, { color: colors.text }]}>Elevation Profile</Text>
      
      <LineChart
        data={chartData}
        width={width - 40}
        height={180}
        chartConfig={chartConfig}
        bezier
        withInnerLines={false}
        withOuterLines={true}
        withHorizontalLabels={true}
        withVerticalLabels={true}
        style={styles.chart}
      />
      
      <View style={styles.legendContainer}>
        <Text style={[styles.legendText, { color: colors.secondaryText }]}>
          Distance (km)
        </Text>
        <Text style={[styles.legendText, { color: colors.secondaryText }]}>
          Elevation (m)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    marginTop: 4,
  },
  legendText: {
    fontSize: 12,
  },
});