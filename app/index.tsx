import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import LandingPage from "./landing";

export default function IndexScreen() {
  if (Platform.OS === 'web') {
    return <LandingPage />;
  }

  const router = useRouter();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const [isSyncing, setIsSyncing] = useState(false);

  const storeUser = useMutation(api.users.storeUser);

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  useEffect(() => {
    const handleRouting = async () => {
      console.log('Routing check:', {
        isClerkLoaded,
        hasClerkUser: !!clerkUser,
        convexUserStatus: convexUser === undefined ? 'loading' : convexUser ? 'exists' : 'null',
        isSyncing,
      });

      if (!isClerkLoaded) {
        console.log('Waiting for Clerk to load...');
        return;
      }

      if (!clerkUser) {
        console.log('No Clerk user on mobile, redirecting to onboarding (as guest/landing proxy)');
        router.replace('/onboarding');
        return;
      }

      if (convexUser === undefined) {
        console.log('Convex user query still loading...');
        return;
      }

      if (!convexUser && !isSyncing) {
        setIsSyncing(true);
        try {
          console.log('Creating new Convex user for Clerk ID:', clerkUser.id);
          const userId = await storeUser({
            clerkId: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            name: clerkUser.fullName || clerkUser.firstName || 'User',
          });
          console.log('User synced successfully, userId:', userId);
        } catch (error) {
          console.error('Failed to sync user to Convex:', error);
        } finally {
          setIsSyncing(false);
        }
        return;
      }

      if (convexUser) {
        console.log('Convex user found:', convexUser._id, 'Age:', convexUser.age);
        const hasCompletedOnboarding = convexUser.age > 0;

        console.log('Onboarding status check:', hasCompletedOnboarding);

        if (!hasCompletedOnboarding) {
          console.log('Redirecting to onboarding (incomplete profile)');
          router.replace('/onboarding');
        } else {
          console.log('Redirecting to tabs (profile complete)');
          router.replace('/(tabs)');
        }
      }
    };

    handleRouting();
  }, [isClerkLoaded, clerkUser, convexUser, isSyncing]);

  // Show loading screen while Clerk or Convex is initializing
  if (!isClerkLoaded || isSyncing || (clerkUser && convexUser === undefined)) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.text}>
          {!isClerkLoaded ? 'Initializing...' : isSyncing ? 'Setting up your account...' : 'Syncing profile...'}
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#ffffff',
    gap: 16,
  },
  text: {
    fontSize: 16,
    color: '#64748b',
  },
});
