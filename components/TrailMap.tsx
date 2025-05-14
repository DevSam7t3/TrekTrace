import Colors from '@/constants/Colors';
import { TrackPoint } from '@/database';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, useColorScheme, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.005;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

type TrailMapProps = {
  trackPoints: TrackPoint[];
  currentLocation?: { latitude: number; longitude: number } | null;
  showCurrentLocation?: boolean;
  initialRegion?: Region;
  style?: any;
};

export default function TrailMap({
  trackPoints,
  currentLocation,
  showCurrentLocation = false,
  initialRegion,
  style,
}: TrailMapProps) {
  const mapRef = useRef<MapView>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const [mapRegion, setMapRegion] = useState<Region | undefined>(initialRegion);
  
  // Group track points by resting status
  const trackSegments = React.useMemo(() => {
    if (!trackPoints || trackPoints.length === 0) return [];
    
    const segments: { points: any[]; isResting: boolean }[] = [];
    let currentSegment: { points: any[]; isResting: boolean } = {
      points: [],
      isResting: !!trackPoints[0].isResting,
    };
    
    trackPoints.forEach((point, index) => {
      // If the resting status changes, start a new segment
      if (index > 0 && point.isResting !== currentSegment.isResting) {
        segments.push(currentSegment);
        currentSegment = {
          points: [],
          isResting: !!point.isResting,
        };
      }
      
      currentSegment.points.push({
        latitude: point.latitude,
        longitude: point.longitude,
      });
    });
    
    // Add the last segment
    if (currentSegment.points.length > 0) {
      segments.push(currentSegment);
    }
    
    return segments;
  }, [trackPoints]);
  
  // Calculate the initial region if not provided
  useEffect(() => {
    if (initialRegion) {
      setMapRegion(initialRegion);
      return;
    }
    
    if (trackPoints && trackPoints.length > 0) {
      // Find the center point of the trail
      const latitudes = trackPoints.map(point => point.latitude);
      const longitudes = trackPoints.map(point => point.longitude);
      
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLong = Math.min(...longitudes);
      const maxLong = Math.max(...longitudes);
      
      const region = {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLong + maxLong) / 2,
        latitudeDelta: Math.max((maxLat - minLat) * 1.5, LATITUDE_DELTA),
        longitudeDelta: Math.max((maxLong - minLong) * 1.5, LONGITUDE_DELTA),
      };
      
      setMapRegion(region);
    } else if (currentLocation) {
      setMapRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    }
  }, [trackPoints, currentLocation, initialRegion]);
  
  // Update map if current location changes
  useEffect(() => {
    if (showCurrentLocation && currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    }
  }, [showCurrentLocation, currentLocation]);
  
  return (
    <View style={[styles.container, style]}>
      {mapRegion ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={mapRegion}
          provider={Platform.OS === 'ios' ? PROVIDER_GOOGLE : undefined}
          showsUserLocation={showCurrentLocation}
          followsUserLocation={showCurrentLocation}
          showsCompass
          showsScale
          showsMyLocationButton
        >
          {/* Render trail segments with different colors */}
          {trackSegments.map((segment, index) => (
            <Polyline
              key={`segment-${index}`}
              coordinates={segment.points}
              strokeWidth={4}
              strokeColor={segment.isResting ? colors.restingPoint : colors.movingPoint}
            />
          ))}
          
          {/* Starting point marker */}
          {trackPoints && trackPoints.length > 0 && (
            <Marker
              coordinate={{
                latitude: trackPoints[0].latitude,
                longitude: trackPoints[0].longitude,
              }}
              title="Start"
              pinColor="green"
            />
          )}
          
          {/* Ending point marker */}
          {trackPoints && trackPoints.length > 1 && (
            <Marker
              coordinate={{
                latitude: trackPoints[trackPoints.length - 1].latitude,
                longitude: trackPoints[trackPoints.length - 1].longitude,
              }}
              title="End"
              pinColor="red"
            />
          )}
        </MapView>
      ) : (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <Text style={{ color: colors.text }}>Loading map...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 12,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});