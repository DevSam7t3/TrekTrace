import Colors from '@/constants/Colors';
import { Hike } from '@/database';
import { ArrowUp, Clock, Navigation } from 'lucide-react-native';
import React from 'react';
import { Dimensions, StyleSheet, Text, useColorScheme, View } from 'react-native';

const { width } = Dimensions.get('window');

type HikeStatsProps = {
  hike: Hike;
  isCompact?: boolean;
  style?: any;
};

export default function HikeStats({ hike, isCompact = false, style }: HikeStatsProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const iconSize = isCompact ? 18 : 24;
  const fontSize = isCompact ? 14 : 18;
  const labelSize = isCompact ? 12 : 14;
  
  return (
    <View style={[
      styles.container, 
      isCompact ? styles.compactContainer : null,
      { backgroundColor: colors.card },
      style
    ]}>
      <View style={styles.statItem}>
        <Clock size={iconSize} color={colors.primary} />
        <Text style={[styles.statValue, { fontSize, color: colors.text }]}>
          {hike.formattedDuration}
        </Text>
        <Text style={[styles.statLabel, { fontSize: labelSize, color: colors.secondaryText }]}>
          Duration
        </Text>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.statItem}>
        <Navigation size={iconSize} color={colors.primary} />
        <Text style={[styles.statValue, { fontSize, color: colors.text }]}>
          {hike.formattedDistance}
        </Text>
        <Text style={[styles.statLabel, { fontSize: labelSize, color: colors.secondaryText }]}>
          Distance
        </Text>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.statItem}>
        <ArrowUp size={iconSize} color={colors.primary} />
        <Text style={[styles.statValue, { fontSize, color: colors.text }]}>
          {hike.formattedElevationGain}
        </Text>
        <Text style={[styles.statLabel, { fontSize: labelSize, color: colors.secondaryText }]}>
          Elevation
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactContainer: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontWeight: '600',
    marginTop: 4,
  },
  statLabel: {
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
  },
});