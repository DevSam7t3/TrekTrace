import Colors from '@/constants/Colors';
import { database, Hike } from '@/database';
import SyncService from '@/services/SyncService';
import { Q } from '@nozbe/watermelondb';
import { Award, BarChart, ChevronRight, CloudOff, LogOut, Moon, Navigation, Repeat, Settings } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const [hikeStats, setHikeStats] = useState({
    totalHikes: 0,
    totalDistance: 0,
    totalElevation: 0,
    totalDuration: 0,
  });
  const [isOnline, setIsOnline] = useState(false);
  const [unsyncedHikes, setUnsyncedHikes] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  
  useEffect(() => {
    loadProfileData();
    checkOnlineStatus();
    
    // Set up a subscription to changes in the hikes table
    const subscription = database.get<Hike>('hikes')
      .query()
      .observe()
      .subscribe(() => {
        loadProfileData();
      });
    
    return () => subscription.unsubscribe();
  }, []);
  
  const loadProfileData = async () => {
    try {
      // Get all completed hikes
      const completedHikes = await database
        .get<Hike>('hikes')
        .query(Q.where('is_draft', false))
        .fetch();
      
      // Calculate total stats
      let totalDistance = 0;
      let totalElevation = 0;
      let totalDuration = 0;
      
      completedHikes.forEach(hike => {
        totalDistance += hike.distance || 0;
        totalElevation += hike.elevationGain || 0;
        totalDuration += hike.duration || 0;
      });
      
      // Count unsynced hikes
      const unsynced = await database
        .get<Hike>('hikes')
        .query(
          Q.where('is_synced', false),
          Q.where('is_draft', false)
        )
        .fetch();
      
      setHikeStats({
        totalHikes: completedHikes.length,
        totalDistance,
        totalElevation,
        totalDuration,
      });
      
      setUnsyncedHikes(unsynced.length);
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };
  
  const checkOnlineStatus = async () => {
    const online = await SyncService.isOnline();
    setIsOnline(online || false);
  };
  
  const handleSyncAll = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'You need an internet connection to sync hikes.');
      return;
    }
    
    if (unsyncedHikes === 0) {
      Alert.alert('No Hikes to Sync', 'All your hikes are already synced.');
      return;
    }
    
    setIsSyncing(true);
    
    try {
      const result = await SyncService.syncAllPendingHikes();
      
      if (result.success) {
        Alert.alert('Success', `Successfully synced ${result.results?.length || 0} hikes.`);
        await loadProfileData();
      } else {
        Alert.alert('Error', result.error || 'Failed to sync hikes. Please try again.');
      }
    } catch (error) {
      console.error('Error syncing all hikes:', error);
      Alert.alert('Error', 'Failed to sync hikes. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };
  
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h`;
  };
  
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Profile Header */}
      <View style={[styles.profileHeader, { backgroundColor: colors.primary }]}>
        <View style={styles.profileInfo}>
          <Image
            source={{ uri: 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg' }}
            style={styles.profileImage}
          />
          <View>
            <Text style={styles.profileName}>Trailblazer</Text>
            <Text style={styles.profileEmail}>hiker@example.com</Text>
          </View>
        </View>
      </View>
      
      {/* Sync Status */}
      {unsyncedHikes > 0 && (
        <TouchableOpacity
          style={[styles.syncCard, { backgroundColor: colors.accent }]}
          onPress={handleSyncAll}
          disabled={isSyncing || !isOnline}
        >
          <View style={styles.syncCardContent}>
            <View style={styles.syncIconContainer}>
              {isOnline ? (
                <Repeat size={24} color="#FFF" />
              ) : (
                <CloudOff size={24} color="#FFF" />
              )}
            </View>
            <View style={styles.syncTextContainer}>
              <Text style={styles.syncTitle}>
                {isOnline ? 'Hikes Need Syncing' : 'You\'re Offline'}
              </Text>
              <Text style={styles.syncSubtitle}>
                {isOnline 
                  ? `${unsyncedHikes} hike${unsyncedHikes !== 1 ? 's' : ''} waiting to be synced`
                  : 'Connect to the internet to sync your hikes'
                }
              </Text>
            </View>
          </View>
          {isOnline && (
            <TouchableOpacity
              style={styles.syncButton}
              onPress={handleSyncAll}
              disabled={isSyncing}
            >
              <Text style={styles.syncButtonText}>
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}
      
      {/* Stats Section */}
      <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Hiking Stats</Text>
        
        <View style={styles.statsGrid}>
          <View style={[styles.statBlock, { backgroundColor: colors.primaryLight }]}>
            <Award size={28} color="#FFF" />
            <Text style={styles.statValue}>{hikeStats.totalHikes}</Text>
            <Text style={styles.statLabel}>Hikes</Text>
          </View>
          
          <View style={[styles.statBlock, { backgroundColor: colors.secondary }]}>
            <Navigation size={28} color="#FFF" />
            <Text style={styles.statValue}>{(hikeStats.totalDistance / 1000).toFixed(1)}</Text>
            <Text style={styles.statLabel}>Kilometers</Text>
          </View>
          
          <View style={[styles.statBlock, { backgroundColor: colors.accent }]}>
            <BarChart size={28} color="#FFF" />
            <Text style={styles.statValue}>{Math.round(hikeStats.totalElevation)}</Text>
            <Text style={styles.statLabel}>Meters Climbed</Text>
          </View>
          
          <View style={[styles.statBlock, { backgroundColor: '#7E57C2' }]}>
            <Clock size={28} color="#FFF" />
            <Text style={styles.statValue}>{formatDuration(hikeStats.totalDuration)}</Text>
            <Text style={styles.statLabel}>Hours Hiked</Text>
          </View>
        </View>
      </View>
      
      {/* Settings Section */}
      <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
        
        <View style={styles.settingsSection}>
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => {
              Alert.alert('Settings', 'This would navigate to detailed app settings');
            }}
          >
            <View style={styles.settingIconLabel}>
              <Settings size={20} color={colors.primary} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>App Settings</Text>
            </View>
            <ChevronRight size={18} color={colors.secondaryText} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => {
              Alert.alert('Privacy Policy', 'This would show the privacy policy');
            }}
          >
            <View style={styles.settingIconLabel}>
              <Shield size={20} color={colors.primary} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </Shield>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Privacy Policy</Text>
            </View>
            <ChevronRight size={18} color={colors.secondaryText} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => {
              Alert.alert('Terms of Service', 'This would show the terms of service');
            }}
          >
            <View style={styles.settingIconLabel}>
              <FileText size={20} color={colors.primary} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </FileText>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Terms of Service</Text>
            </View>
            <ChevronRight size={18} color={colors.secondaryText} />
          </TouchableOpacity>
          
          <View style={styles.settingRow}>
            <View style={styles.settingIconLabel}>
              <Moon size={20} color={colors.primary} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
            </View>
            <Switch
              trackColor={{ false: '#767577', true: colors.primaryLight }}
              thumbColor={colorScheme === 'dark' ? colors.primary : '#f4f3f4'}
              // This would toggle the app's theme in a real app
              value={colorScheme === 'dark'}
              onValueChange={() => {
                Alert.alert('Theme Toggle', 'This would toggle dark/light mode');
              }}
            />
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: colors.accent }]}
          onPress={() => {
            Alert.alert('Logout', 'This would log the user out');
          }}
        >
          <LogOut size={18} color={colors.accent} />
          <Text style={[styles.logoutButtonText, { color: colors.accent }]}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// We need to define these components since they're used but not imported
const Shield = (props: any) => (
  <svg {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

const FileText = (props: any) => (
  <svg {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const Clock = (props: any) => (
  <svg {...props}>
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  profileHeader: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  syncCard: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
  },
  syncCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  syncTextContainer: {
    flex: 1,
  },
  syncTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  syncSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  syncButton: {
    backgroundColor: '#FFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  syncButtonText: {
    color: '#E76F51',
    fontWeight: '600',
  },
  statsCard: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBlock: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  settingsCard: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
    marginTop: 0,
  },
  settingsSection: {
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  settingIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});