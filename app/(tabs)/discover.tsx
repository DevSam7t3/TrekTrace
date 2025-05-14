import Colors from '@/constants/Colors';
import SyncService from '@/services/SyncService';
import { router } from 'expo-router';
import { ArrowUp, Clock, Download, MapPin, Navigation, Search } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';

// Simulated trail data for the discover screen
const SAMPLE_TRAILS = [
  {
    id: '1',
    name: 'Mountain Ridge Trail',
    distance: 5.2,
    duration: 135, // minutes
    elevation: 350,
    location: 'Mountain National Park',
    imageUrl: 'https://images.pexels.com/photos/747964/pexels-photo-747964.jpeg',
    difficulty: 'Moderate',
  },
  {
    id: '2',
    name: 'Lake Loop Trail',
    distance: 3.8,
    duration: 90, // minutes
    elevation: 150,
    location: 'Lake State Park',
    imageUrl: 'https://images.pexels.com/photos/1687845/pexels-photo-1687845.jpeg',
    difficulty: 'Easy',
  },
  {
    id: '3',
    name: 'Waterfall Trail',
    distance: 7.5,
    duration: 225, // minutes
    elevation: 520,
    location: 'Forest Reserve',
    imageUrl: 'https://images.pexels.com/photos/1624438/pexels-photo-1624438.jpeg',
    difficulty: 'Hard',
  },
  {
    id: '4',
    name: 'Coastal Cliff Walk',
    distance: 4.3,
    duration: 105, // minutes
    elevation: 210,
    location: 'Coastal National Park',
    imageUrl: 'https://images.pexels.com/photos/1450082/pexels-photo-1450082.jpeg',
    difficulty: 'Moderate',
  },
  {
    id: '5',
    name: 'Desert Canyon Trail',
    distance: 6.1,
    duration: 180, // minutes
    elevation: 290,
    location: 'Desert State Park',
    imageUrl: 'https://images.pexels.com/photos/1252399/pexels-photo-1252399.jpeg',
    difficulty: 'Hard',
  },
];

export default function DiscoverScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTrails, setFilteredTrails] = useState(SAMPLE_TRAILS);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  
  useEffect(() => {
    checkOnlineStatus();
  }, []);
  
  useEffect(() => {
    // Filter trails based on search query
    if (searchQuery.trim() === '') {
      setFilteredTrails(SAMPLE_TRAILS);
    } else {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const filtered = SAMPLE_TRAILS.filter(
        trail => 
          trail.name.toLowerCase().includes(lowerCaseQuery) ||
          trail.location.toLowerCase().includes(lowerCaseQuery) ||
          trail.difficulty.toLowerCase().includes(lowerCaseQuery)
      );
      setFilteredTrails(filtered);
    }
  }, [searchQuery]);
  
  const checkOnlineStatus = async () => {
    const online = await SyncService.isOnline();
    setIsOnline(online || false);
  };
  
  const handleDownloadTrail = async (trailId: string) => {
    if (!isOnline) {
      alert('You are currently offline. Please connect to the internet to download trails.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // In a real app, this would download the trail from an API
      // For demo purposes, we'll use our simulated fetch remote hike
      const result = await SyncService.fetchRemoteHike(trailId);
      
      if (result.success) {
        alert('Trail downloaded successfully. You can now access it offline.');
        
        // Navigate to the downloaded hike
        router.push(`/hike/${result.hikeId}`);
      } else {
        alert(result.error || 'Failed to download trail. Please try again.');
      }
    } catch (error) {
      console.error('Error downloading trail:', error);
      alert('An error occurred while downloading the trail. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };
  
  const renderTrailItem = ({ item }: {item: any}) => (
    <TouchableOpacity 
      style={[styles.trailCard, { backgroundColor: colors.card }]}
      activeOpacity={0.8}
      onPress={() => {
        // In a real app, this would navigate to a trail detail screen
        alert(`Viewing details for ${item.name}`);
      }}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.trailImage} />
      
      <View style={styles.trailContent}>
        <View style={styles.trailHeader}>
          <Text style={[styles.trailName, { color: colors.text }]}>{item.name}</Text>
          <View style={[
            styles.difficultyBadge,
            { 
              backgroundColor: 
                item.difficulty === 'Easy' ? '#4CAF50' :
                item.difficulty === 'Moderate' ? '#FF9800' : '#F44336' 
            }
          ]}>
            <Text style={styles.difficultyText}>{item.difficulty}</Text>
          </View>
        </View>
        
        <View style={styles.locationContainer}>
          <MapPin size={14} color={colors.secondaryText} />
          <Text style={[styles.locationText, { color: colors.secondaryText }]}>
            {item.location}
          </Text>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Navigation size={16} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.text }]}>
              {item.distance.toFixed(1)} km
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Clock size={16} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.text }]}>
              {formatDuration(item.duration)}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <ArrowUp size={16} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.text }]}>
              {item.elevation} m
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.downloadButton, { backgroundColor: colors.primary }]}
          onPress={() => handleDownloadTrail(item.id)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Download size={16} color="#FFF" />
              <Text style={styles.downloadText}>Download</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Discover Trails</Text>
      </View>
      
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Search size={20} color={colors.secondaryText} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search trails by name, location or difficulty"
          placeholderTextColor={colors.tertiaryText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {!isOnline && (
        <View style={[styles.offlineNotice, { backgroundColor: colors.accent }]}>
          <Text style={styles.offlineText}>
            You are offline. Connect to the internet to discover and download new trails.
          </Text>
        </View>
      )}
      
      <FlatList
        data={filteredTrails}
        renderItem={renderTrailItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.trailsList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  offlineNotice: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  offlineText: {
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
  },
  trailsList: {
    padding: 16,
  },
  trailCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trailImage: {
    width: '100%',
    height: 150,
  },
  trailContent: {
    padding: 16,
  },
  trailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trailName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  difficultyText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  downloadText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
});