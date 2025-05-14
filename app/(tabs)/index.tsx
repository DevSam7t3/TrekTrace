import HikeCard from '@/components/HikeCard';
import TrackingButton from '@/components/TrackingButton';
import Colors from '@/constants/Colors';
import { database, Hike } from '@/database';
import HikeService from '@/services/HikeService';
import SyncService from '@/services/SyncService';
import { Q } from '@nozbe/watermelondb';
import { router } from 'expo-router';
import { Calendar, MapPin, Navigation } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

const { width } = Dimensions.get('window');

function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const [activeHike, setActiveHike] = useState<Hike | null>(null);
  const [recentHikes, setRecentHikes] = useState<Hike[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        // Check online status
        const online = await SyncService.isOnline();
        setIsOnline(online || false);
        
        // Check for active hike
        const active = await HikeService.getActiveHike();
        setActiveHike(active);
        
        // Load recent hikes
        const hikes = await database.get<Hike>('hikes')
          .query(Q.where('is_draft', false), Q.sortBy('finished_at', 'desc'), Q.take(3))
          .fetch();
        
        setRecentHikes(hikes);
      } catch (error) {
        console.error('Error loading home data:', error);
      }
    };
    
    loadData();
    
    // Set up a subscription to changes in the hikes table
    const subscription = database.get<Hike>('hikes')
      .query()
      .observe()
      .subscribe(async () => {
        // Refresh active hike and recent hikes when hikes table changes
        const active = await HikeService.getActiveHike();
        setActiveHike(active);
        
        const hikes = await database.get<Hike>('hikes')
          .query(Q.where('is_draft', false), Q.sortBy('finished_at', 'desc'), Q.take(3))
          .fetch();
        
        setRecentHikes(hikes);
      });
    
    return () => subscription.unsubscribe();
  }, []);
  
  const handleQuickStart = async () => {
    if (activeHike) {
      // Navigate to track screen if there's an active hike
      router.push('/track');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create a new hike with a default name
      const result = await HikeService.createHike(`Hike ${new Date().toLocaleDateString()}`);
      
      if (result.success) {
        router.push('/track');
      }
    } catch (error) {
      console.error('Error starting hike:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Hero Section */}
      <View style={styles.heroContainer}>
        <Image 
          source={{ uri: 'https://images.pexels.com/photos/1271619/pexels-photo-1271619.jpeg' }}
          style={styles.heroImage}
        />
        <View style={styles.heroOverlay}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>
              {activeHike ? 'Continue Your Hike' : 'Start Your Adventure'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {activeHike ? 'You have an active hike in progress' : 'Track your journey through nature'}
            </Text>
            <TrackingButton 
              isTracking={!!activeHike}
              onPress={handleQuickStart}
              isLoading={isLoading}
              label={activeHike ? 'Continue Tracking' : 'Quick Start'}
            />
          </View>
        </View>
      </View>
      
      {/* Recent Hikes Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Recent Hikes
          </Text>
          <TouchableOpacity onPress={() => router.push('/hikes')}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {recentHikes.length > 0 ? (
          recentHikes.map(hike => (
            <HikeCard
              key={hike.id}
              hike={hike}
              onPress={(hikeId: any) => router.push(`/hike/${hikeId}`)}
            />
          ))
        ) : (
          <View style={[styles.emptyStateContainer, { backgroundColor: colors.card }]}>
            <Navigation size={36} color={colors.secondaryText} />
            <Text style={[styles.emptyStateText, { color: colors.text }]}>
              No hikes recorded yet
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.secondaryText }]}>
              Go for a hike and track your journey
            </Text>
          </View>
        )}
      </View>
      
      {/* Discover Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Discover Trails
          </Text>
          <TouchableOpacity onPress={() => router.push('/discover')}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.discoverContainer}
        >
          {/* Sample trails - would be populated from API in a real app */}
          <TouchableOpacity 
            style={[styles.discoverCard, { backgroundColor: colors.card }]}
            onPress={() => router.push('/discover')}
          >
            <Image
              source={{ uri: 'https://images.pexels.com/photos/747964/pexels-photo-747964.jpeg' }}
              style={styles.discoverImage}
            />
            <View style={styles.discoverContent}>
              <Text style={[styles.discoverTitle, { color: colors.text }]}>
                Mountain Ridge Trail
              </Text>
              <View style={styles.discoverMeta}>
                <View style={styles.discoverMetaItem}>
                  <MapPin size={14} color={colors.secondaryText} />
                  <Text style={[styles.discoverMetaText, { color: colors.secondaryText }]}>
                    5.2 km
                  </Text>
                </View>
                <View style={styles.discoverMetaItem}>
                  <Calendar size={14} color={colors.secondaryText} />
                  <Text style={[styles.discoverMetaText, { color: colors.secondaryText }]}>
                    2h 15m
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.discoverCard, { backgroundColor: colors.card }]}
            onPress={() => router.push('/discover')}
          >
            <Image
              source={{ uri: 'https://images.pexels.com/photos/1687845/pexels-photo-1687845.jpeg' }}
              style={styles.discoverImage}
            />
            <View style={styles.discoverContent}>
              <Text style={[styles.discoverTitle, { color: colors.text }]}>
                Lake Loop Trail
              </Text>
              <View style={styles.discoverMeta}>
                <View style={styles.discoverMetaItem}>
                  <MapPin size={14} color={colors.secondaryText} />
                  <Text style={[styles.discoverMetaText, { color: colors.secondaryText }]}>
                    3.8 km
                  </Text>
                </View>
                <View style={styles.discoverMetaItem}>
                  <Calendar size={14} color={colors.secondaryText} />
                  <Text style={[styles.discoverMetaText, { color: colors.secondaryText }]}>
                    1h 30m
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.discoverCard, { backgroundColor: colors.card }]}
            onPress={() => router.push('/discover')}
          >
            <Image
              source={{ uri: 'https://images.pexels.com/photos/1624438/pexels-photo-1624438.jpeg' }}
              style={styles.discoverImage}
            />
            <View style={styles.discoverContent}>
              <Text style={[styles.discoverTitle, { color: colors.text }]}>
                Waterfall Trail
              </Text>
              <View style={styles.discoverMeta}>
                <View style={styles.discoverMetaItem}>
                  <MapPin size={14} color={colors.secondaryText} />
                  <Text style={[styles.discoverMetaText, { color: colors.secondaryText }]}>
                    7.5 km
                  </Text>
                </View>
                <View style={styles.discoverMetaItem}>
                  <Calendar size={14} color={colors.secondaryText} />
                  <Text style={[styles.discoverMetaText, { color: colors.secondaryText }]}>
                    3h 45m
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  heroContainer: {
    height: 240,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
    padding: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyStateContainer: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  discoverContainer: {
    paddingBottom: 8,
  },
  discoverCard: {
    width: width * 0.7,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  discoverImage: {
    width: '100%',
    height: 100,
  },
  discoverContent: {
    padding: 12,
  },
  discoverTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  discoverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discoverMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  discoverMetaText: {
    fontSize: 12,
    marginLeft: 4,
  },
});

export default HomeScreen;