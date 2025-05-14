import Colors from '@/constants/Colors';
import { Hike } from '@/database';
import withObservables from '@nozbe/with-observables';
import { ArrowRight, Calendar, MapPin, Upload } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import HikeStats from './HikeStats';
import TrailMap from './TrailMap';

type HikeCardProps = {
  hike: Hike;
  trackPoints: any[];
  onPress: (hikeId: string) => void;
  showMap?: boolean;
};

function HikeCard({ hike, trackPoints, onPress, showMap = true }: HikeCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={() => onPress(hike.id)}
      activeOpacity={0.7}
    >
      {/* Card Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text 
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {hike.name}
          </Text>
          
          {!hike.isSynced && !hike.isActive && (
            <View style={[styles.syncBadge, { backgroundColor: colors.accent }]}>
              <Upload size={14} color="#FFF" />
              <Text style={styles.syncText}>Not synced</Text>
            </View>
          )}
          
          {hike.isActive && (
            <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.activeText}>Active</Text>
            </View>
          )}
        </View>
        
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Calendar size={14} color={colors.secondaryText} />
            <Text style={[styles.metaText, { color: colors.secondaryText }]}>
              {formatDate(hike.startedAt)}
            </Text>
          </View>
          
          {trackPoints.length > 0 && (
            <View style={styles.metaItem}>
              <MapPin size={14} color={colors.secondaryText} />
              <Text 
                style={[styles.metaText, { color: colors.secondaryText }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {trackPoints.length} points
              </Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Trail Map Preview */}
      {showMap && trackPoints.length > 0 && (
        <View style={styles.mapContainer}>
          <TrailMap
            trackPoints={trackPoints}
            style={styles.map}
          />
        </View>
      )}
      
      {/* Stats and Details */}
      <View style={styles.footer}>
        <HikeStats hike={hike} isCompact={true} style={styles.stats} />
        
        <View style={styles.actionContainer}>
          <ArrowRight size={20} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Enhance with observables to get the trackPoints
const enhanced = withObservables(['hike'], ({ hike }) => ({
  hike,
  trackPoints: hike.trackPoints,
}));

export default enhanced(HikeCard);

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginLeft: 8,
  },
  syncText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginLeft: 8,
  },
  activeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    marginLeft: 4,
  },
  mapContainer: {
    height: 120,
    width: '100%',
    marginBottom: 12,
  },
  map: {
    borderRadius: 0,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  stats: {
    flex: 1,
    marginRight: 8,
  },
  actionContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(64, 145, 108, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});