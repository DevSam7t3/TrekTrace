import ElevationChart from '@/components/ElevationChart';
import HikeStats from '@/components/HikeStats';
import TrailMap from '@/components/TrailMap';
import Colors from '@/constants/Colors';
import { Hike, TrackPoint } from '@/database';
import GpxService from '@/services/GpxService';
import HikeService from '@/services/HikeService';
import SyncService from '@/services/SyncService';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowDownToLine, ArrowLeft, Calendar, MessageSquare, Share2, Trash2, Upload } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

export default function HikeDetailScreen() {
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const [hike, setHike] = useState<Hike | null>(null);
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  
  useEffect(() => {
    loadHikeData(id as string);
    checkOnlineStatus();
  }, [id]);
  
  const loadHikeData = async (hikeId: string) => {
    try {
      setIsLoading(true);
      
      const result = await HikeService.getHikeWithTrackPoints(hikeId);
      
      if (result) {
        setHike(result.hike);
        setTrackPoints(result.trackPoints);
      }
    } catch (error) {
      console.error('Error loading hike data:', error);
      Alert.alert('Error', 'Failed to load hike data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const checkOnlineStatus = async () => {
    const online = await SyncService.isOnline();
    setIsOnline(online || false);
  };
  
  const handleDeleteHike = () => {
    Alert.alert(
      'Delete Hike',
      'Are you sure you want to delete this hike? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!hike) return;
              
              const result = await HikeService.deleteHike(hike.id);
              
              if (result.success) {
                // Navigate back
                router.back();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete hike. Please try again.');
              }
            } catch (error) {
              console.error('Error deleting hike:', error);
              Alert.alert('Error', 'Failed to delete hike. Please try again.');
            }
          },
        },
      ]
    );
  };
  
  const handleShareHike = async () => {
    try {
      if (!hike) return;
      
      // In a real app, this would generate a shareable link
      const shareUrl = `https://trailtracker.example/hikes/${hike.id}`;
      
      await Share.share({
        message: `Check out my hike "${hike.name}" on TrailTracker! ${hike.formattedDistance} with ${hike.formattedElevationGain} elevation gain. ${shareUrl}`,
        title: `${hike.name} - TrailTracker`,
        url: shareUrl, // iOS only
      });
    } catch (error) {
      console.error('Error sharing hike:', error);
      Alert.alert('Error', 'Failed to share hike. Please try again.');
    }
  };
  
  const handleExportGpx = async () => {
    try {
      if (!hike) return;
      
      setIsLoading(true);
      
      const result = await GpxService.exportHikeToGpx(hike.id);
      
      if (result.success) {
        Alert.alert(
          'Export Successful',
          `GPX file exported successfully to: ${result.fileName}`
        );
      } else {
        Alert.alert('Export Failed', result.error || 'Failed to export GPX file.');
      }
    } catch (error) {
      console.error('Error exporting GPX:', error);
      Alert.alert('Error', 'Failed to export GPX file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSyncHike = async () => {
    try {
      if (!hike) return;
      
      if (!isOnline) {
        Alert.alert('Offline', 'You need an internet connection to sync this hike.');
        return;
      }
      
      setIsLoading(true);
      
      const result = await SyncService.syncHike(hike.id);
      
      if (result.success) {
        // Reload hike data to reflect the updated sync status
        await loadHikeData(hike.id);
        Alert.alert('Success', 'Hike synced successfully.');
      } else {
        Alert.alert('Sync Failed',
          result && 'error' in result ? result.error : 'Failed to sync hike. Please try again.'
        );
      }
    } catch (error) {
      console.error('Error syncing hike:', error);
      Alert.alert('Error', 'Failed to sync hike. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Custom Header */}
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {hike?.name || 'Hike Details'}
          </Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleShareHike}
            >
              <Share2 size={22} color={colors.text} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleDeleteHike}
            >
              <Trash2 size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Map Section */}
          <View style={styles.mapContainer}>
            <TrailMap
              trackPoints={trackPoints}
              style={styles.map}
            />
          </View>
          
          {/* Hike Info */}
          <View style={styles.infoSection}>
            <View style={styles.dateContainer}>
              <Calendar size={18} color={colors.secondaryText} />
              <Text style={[styles.dateText, { color: colors.secondaryText }]}>
                {hike ? formatDate(hike.startedAt) : 'Loading...'}
              </Text>
            </View>
            
            {/* Statistics */}
            {hike && (
              <HikeStats hike={hike} style={styles.statsCard} />
            )}
            
            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {!hike?.isSynced && !hike?.isDraft && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: isOnline ? colors.accent : '#ccc' },
                  ]}
                  onPress={handleSyncHike}
                  disabled={!isOnline || isLoading}
                >
                  <Upload size={20} color="#FFF" />
                  <Text style={styles.actionButtonText}>
                    {isOnline ? 'Sync Hike' : 'Offline'}
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={handleExportGpx}
                disabled={isLoading}
              >
                <ArrowDownToLine size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>Export GPX</Text>
              </TouchableOpacity>
            </View>
            
            {/* Elevation Chart */}
            {trackPoints.length > 0 && (
              <ElevationChart trackPoints={trackPoints} style={styles.elevationChart} />
            )}
            
            {/* Notes Section - Placeholder */}
            <View style={[styles.notesSection, { backgroundColor: colors.card }]}>
              <View style={styles.notesSectionHeader}>
                <Text style={[styles.notesSectionTitle, { color: colors.text }]}>Notes</Text>
                <TouchableOpacity>
                  <MessageSquare size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.notesText, { color: colors.secondaryText }]}>
                Add notes about this hike...
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50, // Adjust for status bar
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  mapContainer: {
    height: 300,
    width: '100%',
  },
  map: {
    borderRadius: 0,
  },
  infoSection: {
    padding: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 14,
    marginLeft: 6,
  },
  statsCard: {
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  elevationChart: {
    marginBottom: 24,
  },
  notesSection: {
    borderRadius: 16,
    padding: 16,
  },
  notesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  notesSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 14,
  },
});