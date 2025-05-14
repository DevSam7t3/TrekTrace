import Colors from '@/constants/Colors';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox, useColorScheme } from 'react-native';

// Ignore specific harmless warnings
LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate` with no listeners registered',
  'Non-serializable values were found in the navigation state',
]);

export default function RootLayout() {
  useFrameworkReady();
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <>
      <Stack screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: Colors[colorScheme].background },
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="hike/[id]" options={{ headerShown: false, presentation: 'card' }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}