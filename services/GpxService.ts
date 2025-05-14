import * as FileSystem from 'expo-file-system';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { database, Hike, TrackPoint } from '../database';
import HikeService from './HikeService';

const GpxService = {
  exportHikeToGpx: async (hikeId: string) => {
    try {
      // Get hike and track points
      const result = await HikeService.getHikeWithTrackPoints(hikeId);

      if (!result) {
        return { success: false, error: 'Hike not found' };
      }
      const { hike, trackPoints } = result;
      
      if (!hike || trackPoints.length === 0) {
        return { success: false, error: 'No data available for export' };
      }
      
      // Create GPX structure
      const gpxData = {
        '?xml': {
          '@_version': '1.0',
          '@_encoding': 'UTF-8',
        },
        gpx: {
          '@_version': '1.1',
          '@_creator': 'TrailTracker',
          '@_xmlns': 'http://www.topografix.com/GPX/1/1',
          metadata: {
            name: hike.name,
            time: new Date(hike.startedAt).toISOString(),
          },
          trk: {
            name: hike.name,
            trkseg: {
              trkpt: trackPoints.map((point: any) => ({
                '@_lat': point.latitude,
                '@_lon': point.longitude,
                ele: point.altitude,
                time: new Date(point.timestamp).toISOString(),
                extensions: {
                  is_resting: point.isResting ? '1' : '0',
                },
              })),
            },
          },
        },
      };
      
      // Convert to XML
      const builder = new XMLBuilder({
        attributeNamePrefix: '@_',
        ignoreAttributes: false,
        format: true,
      });
      
      const gpxXml = builder.build(gpxData);
      
      // Generate file name and path
      const fileName = `${hike.name.replace(/\s+/g, '_')}_${new Date().getTime()}.gpx`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      // Write file
      await FileSystem.writeAsStringAsync(filePath, gpxXml);
      
      // Share file
      return {
        success: true,
        filePath,
        fileName,
      };
    } catch (error) {
      console.error('Error exporting GPX:', error);
      return { success: false, error: 'Failed to export GPX file' };
    }
  },
  
  importGpxFile: async (fileUri: string, hikeName: string) => {
    try {
      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      
      // Parse GPX
      const parser = new XMLParser({
        attributeNamePrefix: '@_',
        ignoreAttributes: false,
      });
      
      const parsedData = parser.parse(fileContent);
      
      if (!parsedData.gpx || !parsedData.gpx.trk || !parsedData.gpx.trk.trkseg || !parsedData.gpx.trk.trkseg.trkpt) {
        return { success: false, error: 'Invalid GPX format' };
      }
      
      // Extract track points
      const trkpts = Array.isArray(parsedData.gpx.trk.trkseg.trkpt)
        ? parsedData.gpx.trk.trkseg.trkpt
        : [parsedData.gpx.trk.trkseg.trkpt];
      
      if (trkpts.length === 0) {
        return { success: false, error: 'No track points found in GPX file' };
      }
      
      // Create a new hike in the database
      let newHikeId: string;
      
      await database.write(async () => {
        const newHike = await database.get<Hike>('hikes').create(hike => {
          hike.name = hikeName || parsedData.gpx.trk.name || 'Imported Hike';
          hike.startedAt = new Date(trkpts[0].time || Date.now());
          hike.finishedAt = new Date(trkpts[trkpts.length - 1].time || Date.now());
          hike.isDraft = false;
          hike.isSynced = false;
          hike.isImported = true;
        });
        
        newHikeId = newHike.id;
        
        // Add track points
        for (const point of trkpts) {
          await database.get<TrackPoint>('track_points').create(tp => {
            tp.hikeId = newHikeId;
            tp.latitude = parseFloat(point['@_lat']);
            tp.longitude = parseFloat(point['@_lon']);
            tp.altitude = point.ele ? parseFloat(point.ele) : 0;
            tp.timestamp = new Date(point.time || Date.now());
            tp.isResting = point.extensions?.is_resting === '1';
          });
        }
      });
      
      // Calculate and update statistics
      const result = await HikeService.getHikeWithTrackPoints(newHikeId!);
      if (!result) {
        console.error('Imported hike not found after retrieval.');
        return { success: false, error: 'Failed to retrieve imported hike.' };
      }
      const { hike, trackPoints } = result;
      
      // Calculate statistics using HikeService
      const points = trackPoints.map((point: any) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        altitude: point.altitude || 0,
        timestamp: point.timestamp.getTime(),
      }));
      
      await database.write(async () => {
        await hike.update(h => {
          // These calculations would typically be in HikeService but accessing them directly for this import
          if (points.length >= 2) {
            const startTime = Math.min(...points.map((p: any) => p.timestamp));
            const endTime = Math.max(...points.map((p: any) => p.timestamp));
            
            // Update statistics
            h.duration = (endTime - startTime) / 1000; // seconds
            
            // Distance calculation would normally be done with turf.js
            // For simplicity, we're using a placeholder
            h.distance = 0; // Will be calculated and updated by HikeService
            
            // Elevation calculation
            let totalGain = 0;
            for (let i = 1; i < points.length; i++) {
              const diff = points[i].altitude - points[i - 1].altitude;
              if (diff > 0) totalGain += diff;
            }
            h.elevationGain = totalGain;
          }
        });
      });
      
      return {
        success: true,
        hikeId: newHikeId!,
      };
    } catch (error) {
      console.error('Error importing GPX:', error);
      return { success: false, error: 'Failed to import GPX file' };
    }
  },
};

export default GpxService;