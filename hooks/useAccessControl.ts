import { useMemo } from 'react';
import { Alert } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { api } from '@/convex/_generated/api';
import { useSubscription } from '@/context/SubscriptionProvider';

export function useAccessControl() {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const sub = useSubscription();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const isAdmin = useMemo(() => {
    return sub.isAdmin;
  }, [convexUser?.isAdmin, convexUser?.role]);

  const isPro = useMemo(() => {
    return sub.isPro;
  }, [sub.isPro]);

  function promptUpgrade(message: string) {
    Alert.alert('Premium Required', message, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Upgrade', onPress: () => router.push('/premium') },
    ]);
  }

  return { convexUser, isAdmin, isPro, promptUpgrade };
}


