import HikeCard from '@/components/HikeCard';
import Colors from '@/constants/Colors';
import { database, Hike } from '@/database';
import GpxService from '@/services/GpxService';
import HikeService from '@/services/HikeService';
import SyncService from '@/services/SyncService';
import { Q } from '@nozbe/watermelondb';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { ArrowDownToLine, Import, Trash2, Upload } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

export default function HikesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const [hikes, setHikes] = useState<Hike[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  
  useEffect(() => {
    loadHikes();
    checkOnlineStatus();
    
    // Set up a subscription to changes in the hikes table
    const subscription = database.get<Hike>('hikes')
      .query()
      .observe()
      .subscribe(() => {
        loadHikes();
      });
    
    return () => subscription.unsubscribe();
  }, []);
  
  const loadHikes = async () => {
    try {
      const hikeRecords = await database.get<Hike>('hikes')
        .query(Q.sortBy('updated_at', 'desc'))
        .fetch();
      
      setHikes(hikeRecords);
    } catch (error) {
      console.error('Error loading hikes:', error);
    }
  };
  
  const checkOnlineStatus = async () => {
    const online = await SyncService.isOnline();
    setIsOnline(online || false);
  };
  
  const handleHikePress = (hikeId: string) => {
    router.push(`/hike/${hikeId}`);
  };
  
  const handleDeleteHike = (hike: Hike) => {
    Alert.alert(
      'Delete Hike',
      `Are you sure you want to delete "${hike.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await HikeService.deleteHike(hike.id);
              // Hikes will refresh automatically due to the subscription
            } catch (error) {
              console.error('Error deleting hike:', error);
              Alert.alert('Error', 'Failed to delete hike. Please try again.');
            }
          },
        },
      ]
    );
  };
  
  const handleSyncHike = async (hike: Hike) => {
    if (!isOnline) {
      Alert.alert('Offline', 'You need an internet connection to sync hikes.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await SyncService.syncHike(hike.id);
      
      if (result.success) {
        Alert.alert('Success', 'Hike synced successfully.');
      } else {
        if (result && 'error' in result && result.error) {
          Alert.alert('Error', result.error);
        } else {
          Alert.alert('Error', 'Failed to sync hike. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error syncing hike:', error);
      Alert.alert('Error', 'Failed to sync hike. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExportGpx = async (hike: Hike) => {
    setIsLoading(true);
    
    try {
      const result = await GpxService.exportHikeToGpx(hike.id);
      
      if (result.success) {
        Alert.alert(
          'Export Successful',
          `GPX file exported successfully to: ${result.fileName}`,
          [
            { text: 'OK' }
          ]
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
  
  const handleImportGpx = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/gpx+xml',
        copyToCacheDirectory: true,
      });
      
      if (result.canceled) {
        console.log('Document picking canceled');
        return;
      }
      
      setIsLoading(true);
      
      // Prompt for a name for the imported hike
      Alert.prompt(
        'Import GPX',
        'Enter a name for this imported hike:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            onPress: async (name) => {
              try {
                if (!name) name = 'Imported Hike';
                
                const importResult = await GpxService.importGpxFile(result.assets[0].uri, name);
                
                if (importResult.success) {
                  Alert.alert(
                    'Import Successful',
                    'GPX file imported successfully.',
                    [
                      { 
                        text: 'View Hike', 
                        onPress: () => router.push(`/hike/${importResult.hikeId}`) 
                      },
                      { text: 'OK' }
                    ]
                  );
                } else {
                  Alert.alert('Import Failed', importResult.error || 'Failed to import GPX file.');
                }
              } catch (error) {
                console.error('Error importing GPX:', error);
                Alert.alert('Error', 'Failed to import GPX file. Please try again.');
              } finally {
                setIsLoading(false);
              }
            },
          },
        ],
        'plain-text',
        'Imported Hike'
      );
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select GPX file. Please try again.');
      setIsLoading(false);
    }
  };
  
  const renderHikeItem = ({ item }: { item: Hike }) => {
    return (
      <View style={styles.hikeItemContainer}>
        <HikeCard
          hike={item}
          onPress={handleHikePress}
        />
        
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => handleExportGpx(item)}
          >
            <ArrowDownToLine size={18} color="#FFF" />
            <Text style={styles.actionButtonText}>Export GPX</Text>
          </TouchableOpacity>
          
          {!item.isSynced && !item.isDraft && isOnline && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.accent }]}
              onPress={() => handleSyncHike(item)}
            >
              <Upload size={18} color="#FFF" />
              <Text style={styles.actionButtonText}>Sync</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#E53935' }]}
            onPress={() => handleDeleteHike(item)}
          >
            <Trash2 size={18} color="#FFF" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Hikes</Text>
        
        <TouchableOpacity
          style={[styles.importButton, { backgroundColor: colors.primary }]}
          onPress={handleImportGpx}
        >
          <Import size={18} color="#FFF" />
          <Text style={styles.importButtonText}>Import GPX</Text>
        </TouchableOpacity>
      </View>
      
      {hikes.length > 0 ? (
        <FlatList
          data={hikes}
          renderItem={renderHikeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            No hikes recorded yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.secondaryText }]}>
            Go for a hike or import a GPX file
          </Text>
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/track')}
          >
            <Text style={styles.startButtonText}>Start Tracking</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  importButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  listContent: {
    padding: 16,
  },
  hikeItemContainer: {
    marginBottom: 24,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  startButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});