import { useMemo } from 'react';
import { Alert } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { api } from '@/convex/_generated/api';

export function useAccessControl() {
  const router = useRouter();
  const { user: clerkUser } = useUser();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const isAdmin = useMemo(() => {
    return (
      convexUser?.isAdmin === true ||
      convexUser?.role === 'admin' ||
      convexUser?.role === 'super_admin'
    );
  }, [convexUser?.isAdmin, convexUser?.role]);

  const isPro = useMemo(() => {
    return (
      isAdmin ||
      convexUser?.subscriptionStatus === 'pro' ||
      convexUser?.isPremium === true
    );
  }, [convexUser?.subscriptionStatus, convexUser?.isPremium, isAdmin]);

  function promptUpgrade(message: string) {
    Alert.alert('Premium Required', message, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Upgrade', onPress: () => router.push('/premium') },
    ]);
  }

  return { convexUser, isAdmin, isPro, promptUpgrade };
}


