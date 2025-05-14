import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, View, Text } from 'react-native';
import { Play, Square, PauseCircle, Navigation } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

type TrackingButtonProps = {
  isTracking: boolean;
  isPaused?: boolean;
  isLoading?: boolean;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  label?: string;
};

export default function TrackingButton({
  isTracking,
  isPaused = false,
  isLoading = false,
  onPress,
  size = 'large',
  label,
}: TrackingButtonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };
  
  // Determine sizes based on the size prop
  const buttonSize = {
    small: 50,
    medium: 70,
    large: 90,
  }[size];
  
  const iconSize = {
    small: 22,
    medium: 30,
    large: 38,
  }[size];
  
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          { 
            width: buttonSize, 
            height: buttonSize,
            backgroundColor: isTracking ? colors.accent : colors.primary,
          },
        ]}
        onPress={handlePress}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFF" size="large" />
        ) : (
          <>
            {isTracking ? (
              <Square color="#FFF" size={iconSize} strokeWidth={2.5} />
            ) : (
              <Navigation color="#FFF" size={iconSize} strokeWidth={2.5} />
            )}
          </>
        )}
      </TouchableOpacity>
      {label && (
        <Text style={[styles.label, { color: colors.text }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  label: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
});