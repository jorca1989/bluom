import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { ConvexClerkProvider } from '@/providers/ConvexClerkProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RevenueCatBootstrapper } from '@/components/RevenueCatBootstrapper';
import { SubscriptionProvider } from '@/context/SubscriptionProvider';
import { CelebrationProvider } from '@/context/CelebrationContext';

// Polyfill Buffer for libraries like react-native-svg (used by lucide-react-native).
import { Buffer } from 'buffer';
globalThis.Buffer = globalThis.Buffer ?? Buffer;

export default function RootLayout() {
  useFrameworkReady();
  useSoundEffects();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ConvexClerkProvider>
          <RevenueCatBootstrapper />
          <SubscriptionProvider>
            <CelebrationProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: '#ffffff' },
                }}
              >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
              name="(auth)/login"
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="(auth)/signup"
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="onboarding"
              options={{
                headerShown: false,
                presentation: 'card',
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="premium"
              options={{
                headerShown: false,
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="settings"
              options={{
                headerShown: false,
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="admin"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen name="+not-found" options={{ headerShown: false }} />
          </Stack>
          </CelebrationProvider>
          </SubscriptionProvider>
          <StatusBar style="auto" />
        </ConvexClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
