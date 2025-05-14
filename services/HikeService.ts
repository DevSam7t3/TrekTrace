import { Q } from '@nozbe/watermelondb';
import * as turf from '@turf/turf';
import { database, Hike, TrackPoint } from '../database';
import LocationService from './LocationService';

const HikeService = {
  // Create a new hike
  createHike: async (name: string) => {
    try {
      let newHike: Hike;
      
      await database.write(async () => {
        newHike = await database.get<Hike>('hikes').create(hike => {
          hike.name = name;
          hike.startedAt = new Date();
          hike.isDraft = true;
          hike.isSynced = false;
        });
      });
      
      // Start location tracking for this hike
      await LocationService.startTracking(newHike!.id);
      
      return { success: true, hikeId: newHike!.id };
    } catch (error) {
      console.error('Error creating hike:', error);
      return { success: false, error: 'Failed to create hike' };
    }
  },
  
  // Finish an active hike
  finishHike: async (hikeId: string) => {
    try {
      // Stop location tracking
      await LocationService.stopTracking();
      
      // Calculate hike statistics
      const trackPoints = await database
        .get<TrackPoint>('track_points')
        .query(Q.where('hike_id', hikeId))
        .fetch();
      
      if (trackPoints.length === 0) {
        return { success: false, error: 'No track points found for this hike' };
      }
      
      // Calculate statistics
      const points = trackPoints.map(point => ({
        latitude: point.latitude,
        longitude: point.longitude,
        altitude: point.altitude || 0,
        timestamp: point.timestamp.getTime(),
      }));
      
      const distance = calculateTotalDistance(points);
      const duration = calculateDuration(points);
      const elevationGain = calculateElevationGain(points);
      
      // Update the hike with statistics
      await database.write(async () => {
        const hike = await database.get<Hike>('hikes').find(hikeId);
        await hike.update(h => {
          h.finishedAt = new Date();
          h.distance = distance;
          h.duration = duration;
          h.elevationGain = elevationGain;
        });
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error finishing hike:', error);
      return { success: false, error: 'Failed to finish hike' };
    }
  },
  
  // Get all hikes
  getHikes: async () => {
    try {
      return await database.get<Hike>('hikes').query().fetch();
    } catch (error) {
      console.error('Error getting hikes:', error);
      return [];
    }
  },
  
  // Get a specific hike with its track points
  getHikeWithTrackPoints: async (hikeId: string) => {
    try {
      const hike = await database.get<Hike>('hikes').find(hikeId);
      const trackPoints = await hike.trackPoints.fetch();
      
      return { hike, trackPoints };
    } catch (error) {
      console.error('Error getting hike with track points:', error);
      return null;
    }
  },
  
  // Get active hike if any
  getActiveHike: async () => {
    try {
      const activeHikeId = LocationService.getActiveHikeId();
      
      if (!activeHikeId) {
        // Check if there's any unfinished hike
        const unfinishedHikes = await database
          .get<Hike>('hikes')
          .query(
            Q.where('is_draft', true),
            Q.where('finished_at', null)
          )
          .fetch();
        
        return unfinishedHikes.length > 0 ? unfinishedHikes[0] : null;
      }
      
      return await database.get<Hike>('hikes').find(activeHikeId);
    } catch (error) {
      console.error('Error getting active hike:', error);
      return null;
    }
  },
  
  // Delete a hike and its track points
  deleteHike: async (hikeId: string) => {
    try {
      await database.write(async () => {
        const hike = await database.get<Hike>('hikes').find(hikeId);
        const trackPoints = await hike.trackPoints.fetch();
        
        // Delete all track points first
        for (const point of trackPoints) {
          await point.destroyPermanently();
        }
        
        // Then delete the hike
        await hike.destroyPermanently();
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting hike:', error);
      return { success: false, error: 'Failed to delete hike' };
    }
  },
  
  // Update a hike's details
  updateHike: async (hikeId: string, details: { name?: string, isDraft?: boolean, isSynced?: boolean }) => {
    try {
      await database.write(async () => {
        const hike = await database.get<Hike>('hikes').find(hikeId);
        await hike.update(h => {
          if (details.name !== undefined) h.name = details.name;
          if (details.isDraft !== undefined) h.isDraft = details.isDraft;
          if (details.isSynced !== undefined) h.isSynced = details.isSynced;
        });
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating hike:', error);
      return { success: false, error: 'Failed to update hike' };
    }
  },
};

// Helper functions for calculations
function calculateTotalDistance(points: { latitude: number; longitude: number }[]): number {
  if (points.length < 2) return 0;
  
  const lineString = turf.lineString(points.map(p => [p.longitude, p.latitude]));
  return turf.length(lineString, { units: 'kilometers' }) * 1000; // Convert to meters
}

function calculateDuration(points: { timestamp: number }[]): number {
  if (points.length < 2) return 0;
  
  const startTime = Math.min(...points.map(p => p.timestamp));
  const endTime = Math.max(...points.map(p => p.timestamp));
  
  return (endTime - startTime) / 1000; // Convert to seconds
}

function calculateElevationGain(points: { altitude: number }[]): number {
  if (points.length < 2) return 0;
  
  let totalGain = 0;
  
  for (let i = 1; i < points.length; i++) {
    const diff = points[i].altitude - points[i - 1].altitude;
    if (diff > 0) totalGain += diff;
  }
  
  return totalGain;
}

export default HikeService;