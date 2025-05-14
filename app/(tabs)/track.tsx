import TrackingButton from '@/components/TrackingButton';
import TrailMap from '@/components/TrailMap';
import Colors from '@/constants/Colors';
import { database, Hike, TrackPoint } from '@/database';
import HikeService from '@/services/HikeService';
import LocationService from '@/services/LocationService';
import { Q } from '@nozbe/watermelondb';
import * as Location from 'expo-location';
import { router, useNavigation } from 'expo-router';
import { ArrowUp, Clock, Edit2, Navigation, PauseCircle, PlayCircle } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

export default function TrackScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const navigation = useNavigation();
  
  const [activeHike, setActiveHike] = useState<Hike | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [stats, setStats] = useState({
    distance: 0,
    duration: 0,
    elevationGain: 0,
  });
  
  // For timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load active hike and set up location tracking
  useEffect(() => {
    const loadActiveHike = async () => {
      try {
        // Request location permissions
        await LocationService.requestPermissions();
        
        // Get current location
        const location = await LocationService.getCurrentLocation();
        if (location) {
          setCurrentLocation(location);
        }
        
        // Check if location tracking is active
        const isTrackingActive = await LocationService.isTrackingActive();
        setIsTracking(isTrackingActive);
        
        // Load active hike if any
        const hike = await HikeService.getActiveHike();
        setActiveHike(hike);
        
        if (hike) {
          // Load track points for this hike
          loadTrackPoints(hike.id);
          
          // Start timer for elapsed time
          if (isTrackingActive) {
            startTimer(hike.startedAt.getTime());
          }
        }
      } catch (error) {
        console.error('Error loading active hike:', error);
      }
    };
    
    loadActiveHike();
    
    // Set up location subscription for current location updates
    let locationSubscription: Location.LocationSubscription | null = null;
    
    if (Platform.OS !== 'web') {
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 10,
        },
        (location) => {
          setCurrentLocation(location);
        }
      ).then(subscription => {
        locationSubscription = subscription;
      });
    }
    
    return () => {
      // Clean up timer and location subscription
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);
  
  // Set up subscription to track points
  useEffect(() => {
    if (!activeHike) return;
    
    const subscription = database.get<TrackPoint>('track_points')
      .query(Q.where('hike_id', activeHike.id))
      .observe()
      .subscribe(points => {
        setTrackPoints(points);
        
        // Calculate stats
        if (points.length > 0) {
          calculateStats(points);
        }
      });
    
    return () => subscription.unsubscribe();
  }, [activeHike]);
  
  // Load track points for a specific hike
  const loadTrackPoints = async (hikeId: string) => {
    try {
      const points = await database
        .get<TrackPoint>('track_points')
        .query(Q.where('hike_id', hikeId), Q.sortBy('timestamp', 'asc'))
        .fetch();
      
      setTrackPoints(points);
      
      // Calculate stats
      if (points.length > 0) {
        calculateStats(points);
      }
    } catch (error) {
      console.error('Error loading track points:', error);
    }
  };
  
  // Calculate hike statistics
  const calculateStats = (points: TrackPoint[]) => {
    if (points.length < 2) return;
    
    // Distance calculation using Haversine formula
    let totalDistance = 0;
    let totalElevationGain = 0;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      
      // Distance
      const R = 6371e3; // Earth's radius in meters
      const φ1 = prev.latitude * Math.PI / 180;
      const φ2 = curr.latitude * Math.PI / 180;
      const Δφ = (curr.latitude - prev.latitude) * Math.PI / 180;
      const Δλ = (curr.longitude - prev.longitude) * Math.PI / 180;
      
      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c; // in meters
      
      totalDistance += distance;
      
      // Elevation
      if (curr.altitude && prev.altitude) {
        const elevDiff = curr.altitude - prev.altitude;
        if (elevDiff > 0) {
          totalElevationGain += elevDiff;
        }
      }
    }
    
    // Duration
    const startTime = points[0].timestamp.getTime();
    const endTime = points[points.length - 1].timestamp.getTime();
    const duration = Math.floor((endTime - startTime) / 1000); // in seconds
    
    setStats({
      distance: totalDistance,
      duration,
      elevationGain: totalElevationGain,
    });
  };
  
  // Start or resume tracking
  const handleStartTracking = async () => {
    setIsLoading(true);
    
    try {
      if (!activeHike) {
        // Create a new hike
        const result = await HikeService.createHike(`Hike ${new Date().toLocaleDateString()}`);
        
        if (result.success && result.hikeId) {
          const hike = await database.get<Hike>('hikes').find(result.hikeId);
          setActiveHike(hike);
          setIsTracking(true);
          startTimer(new Date().getTime());
        }
      } else {
        // Resume existing hike
        await LocationService.startTracking(activeHike.id);
        setIsTracking(true);
        setIsPaused(false);
        startTimer(activeHike.startedAt.getTime());
      }
    } catch (error) {
      console.error('Error starting hike:', error);
      Alert.alert('Error', 'Failed to start tracking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Stop tracking
  const handleStopTracking = () => {
    Alert.alert(
      'Finish Hike',
      'Do you want to finish this hike?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            
            try {
              if (activeHike) {
                await HikeService.finishHike(activeHike.id);
                
                // Stop timer
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
                
                setIsTracking(false);
                setIsPaused(false);
                
                // Navigate to hike details
                router.push(`/hike/${activeHike.id}`);
              }
            } catch (error) {
              console.error('Error finishing hike:', error);
              Alert.alert('Error', 'Failed to finish hike. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };
  
  // Pause tracking
  const handlePauseTracking = async () => {
    if (isPaused) {
      // Resume tracking
      if (activeHike) {
        await LocationService.startTracking(activeHike.id);
        setIsPaused(false);
      }
    } else {
      // Pause tracking
      await LocationService.stopTracking();
      
      // Stop timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      setIsPaused(true);
    }
  };
  
  // Start the timer
  const startTimer = (startTime: number) => {
    // Calculate initial elapsed time
    const now = Date.now();
    const initialElapsed = Math.floor((now - startTime) / 1000);
    setElapsedTime(initialElapsed);
    
    // Set up interval to update elapsed time
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => { // Type 'number' is not assignable to type 'Timeout'.
      setElapsedTime(prev => prev + 1);
    }, 1000) as unknown as NodeJS.Timeout; // Explicitly cast to NodeJS.Timeout
  };
  
  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Format distance in km or m
  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${Math.round(meters)} m`;
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Map area */}
      <View style={styles.mapContainer}>
        <TrailMap
          trackPoints={trackPoints}
          currentLocation={currentLocation ? { latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude } : null}
          showCurrentLocation={true}
        />
      </View>
      
      {/* Stats overlay */}
      <View style={styles.statsOverlay}>
        <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
          <View style={styles.statItem}>
            <Clock size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatTime(elapsedTime)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>
              Duration
            </Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Navigation size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatDistance(stats.distance)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>
              Distance
            </Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <ArrowUp size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {Math.round(stats.elevationGain)} m
            </Text>
            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>
              Elevation
            </Text>
          </View>
        </View>
      </View>
      
      {/* Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          {isTracking && (
            <TouchableOpacity
              style={[
                styles.controlButton,
                { backgroundColor: isPaused ? colors.primary : colors.secondaryText },
              ]}
              onPress={handlePauseTracking}
            >
              {isPaused ? (
                <PlayCircle size={24} color="#FFF" />
              ) : (
                <PauseCircle size={24} color="#FFF" />
              )}
            </TouchableOpacity>
          )}
          
          <TrackingButton
            isTracking={isTracking}
            isPaused={isPaused}
            isLoading={isLoading}
            onPress={isTracking ? handleStopTracking : handleStartTracking}
            label={isTracking ? 'Finish Hike' : 'Start Tracking'}
          />
          
          {isTracking && activeHike && (
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: colors.primaryLight }]}
              onPress={() => {
                // Show a dialog to rename the hike
                Alert.prompt(
                  'Rename Hike',
                  'Enter a new name for this hike:',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Save',
                      onPress: async (name) => {
                        if (name && activeHike) {
                          await HikeService.updateHike(activeHike.id, { name });
                        }
                      },
                    },
                  ],
                  'plain-text',
                  activeHike.name
                );
              }}
            >
              <Edit2 size={24} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  statsOverlay: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
});