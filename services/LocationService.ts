import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as geolib from 'geolib';
import { database, TrackPoint } from '../database';

// Define the background task name
const LOCATION_TRACKING = 'location-tracking';

// Time threshold for rest detection (5 minutes in milliseconds)
const REST_THRESHOLD = 5 * 60 * 1000;

// Distance threshold for significant movement (meters)
const MOVEMENT_THRESHOLD = 10;

// Track the active hike ID
let activeHikeId: string | null = null;
let lastLocation: Location.LocationObject | null = null;
let lastMovementTime: number = Date.now();
let isRestingMode: boolean = false;

// Define the background task
TaskManager.defineTask(LOCATION_TRACKING, async ({ data, error }) => {
  if (error) {
    console.error('Location tracking task error:', error);
    return;
  }
  if (!data) {
    console.log('No location data received');
    return;
  }
  if (!activeHikeId) {
    console.log('No active hike, skipping location update');
    return;
  }

  const { locations } = data as { locations: Location.LocationObject[] };
  const location = locations[0];

  // Calculate if resting based on time and distance
  const now = Date.now();
  let isResting = false;

  if (lastLocation) {
    const distance = geolib.getDistance(
      { latitude: lastLocation.coords.latitude, longitude: lastLocation.coords.longitude },
      { latitude: location.coords.latitude, longitude: location.coords.longitude }
    );

    // If significant movement detected, update movement time
    if (distance > MOVEMENT_THRESHOLD) {
      lastMovementTime = now;
      if (isRestingMode) {
        isRestingMode = false;
        console.log('Movement detected, exiting rest mode');
      }
    } 
    // Check if we should enter resting mode
    else if (now - lastMovementTime > REST_THRESHOLD && !isRestingMode) {
      isRestingMode = true;
      console.log('Rest period detected');
    }
    
    isResting = isRestingMode;
  }

  // Save the location point to the database
  try {
    await database.write(async () => {
      await database.get<TrackPoint>('track_points').create(point => {
        point.hikeId = activeHikeId!;
        point.latitude = location.coords.latitude;
        point.longitude = location.coords.longitude;
        point.altitude = location.coords.altitude || 0;
        point.timestamp = new Date(location.timestamp);
        point.isResting = isResting;
        point.speed = location.coords.speed || 0;
        point.heading = location.coords.heading || 0;
      });
    });

    // Update last location
    lastLocation = location;
  } catch (e) {
    console.error('Error saving location point:', e);
  }
});

const LocationService = {
  requestPermissions: async () => {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    
    if (foregroundStatus !== 'granted') {
      return { granted: false, error: 'Foreground location permission not granted' };
    }
    
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    
    if (backgroundStatus !== 'granted') {
      return { granted: false, error: 'Background location permission not granted' };
    }
    
    return { granted: true, error: null };
  },
  
  startTracking: async (hikeId: string) => {
    try {
      const permissionResult = await LocationService.requestPermissions();
      
      if (!permissionResult.granted) {
        return { success: false, error: permissionResult.error };
      }
      
      // Check if the task is already running
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING);
      
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TRACKING);
      }
      
      // Set active hike ID
      activeHikeId = hikeId;
      lastMovementTime = Date.now();
      isRestingMode = false;
      
      // Start the background location tracking
      await Location.startLocationUpdatesAsync(LOCATION_TRACKING, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 10000, // 10 second interval
        distanceInterval: 10, // 10 meters minimum movement
        deferredUpdatesInterval: 60000, // 1 minute for batched updates
        foregroundService: {
          notificationTitle: 'TrailTracker is active',
          notificationBody: 'Tracking your hike in the background',
        },
        showsBackgroundLocationIndicator: true,
        activityType: Location.ActivityType.Fitness,
      });
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Error starting location tracking:', error);
      return { success: false, error: 'Failed to start location tracking' };
    }
  },
  
  stopTracking: async () => {
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING);
      
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TRACKING);
      }
      
      activeHikeId = null;
      lastLocation = null;
      
      return { success: true };
    } catch (error) {
      console.error('Error stopping location tracking:', error);
      return { success: false, error: 'Failed to stop location tracking' };
    }
  },
  
  getCurrentLocation: async () => {
    try {
      const { granted } = await LocationService.requestPermissions();
      
      if (!granted) {
        return null;
      }
      
      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  },
  
  isTrackingActive: async () => {
    try {
      return await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING);
    } catch (error) {
      console.error('Error checking tracking status:', error);
      return false;
    }
  },

  getActiveHikeId: () => {
    return activeHikeId;
  }
};

export default LocationService;