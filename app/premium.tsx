import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  getOfferingsSafe,
  pickProOffering,
  pickMonthlyAndAnnualPackages,
  purchasePackageSafe,
} from '@/utils/revenuecat';

export default function PremiumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const isPro = useMemo(() => {
    return (
      convexUser?.subscriptionStatus === 'pro' ||
      convexUser?.isPremium ||
      convexUser?.isAdmin ||
      convexUser?.role === 'admin' ||
      convexUser?.role === 'super_admin'
    );
  }, [convexUser?.subscriptionStatus, convexUser?.isPremium, convexUser?.isAdmin, convexUser?.role]);

  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [offerings, setOfferings] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const o = await getOfferingsSafe();
      if (!mounted) return;
      setOfferings(o);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const offering = useMemo(() => pickProOffering(offerings), [offerings]);
  const pkgs = useMemo(() => pickMonthlyAndAnnualPackages(offering), [offering]);

  async function purchase(kind: 'monthly' | 'annual') {
    const pkg = kind === 'annual' ? pkgs.annual : pkgs.monthly;
    if (!pkg) {
      Alert.alert(
        'RevenueCat not configured',
        'Configure Monthly + Annual packages in RevenueCat, and add EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY.'
      );
      return;
    }
    setUpgrading(true);
    try {
      await purchasePackageSafe(pkg);
      Alert.alert('Success', 'Purchase complete. Pro access may take a moment to sync.');
      router.back();
    } catch (e: any) {
      Alert.alert('Purchase failed', e?.message ? String(e.message) : 'Please try again.');
    } finally {
      setUpgrading(false);
    }
  }

  if (!isClerkLoaded || convexUser === undefined) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="close" size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Go Pro</Text>
          <Text style={styles.headerSub}>Monthly or Annual</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {isPro ? (
        <View style={[styles.card, { margin: 16 }]}>
          <Text style={styles.proTitle}>You’re already Pro</Text>
          <Text style={styles.proSub}>No upgrade needed.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.primaryText}>Close</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>The Life Management Ecosystem</Text>
            <Text style={styles.heroSub}>
              Unlock everything: AI Coach, Specialized Health Hubs, Fasting Tracker, and Household Assistant.
            </Text>
          </View>

          <PlanCard
            title="Monthly Pro"
            subtitle="$9.95 / month"
            price="$9.95"
            popular={false}
            disabled={upgrading || !pkgs.monthly}
            onPress={() => purchase('monthly')}
          />
          <PlanCard
            title="Annual Pro"
            subtitle="Save 50% - Only $4.95/mo"
            price="$59.40"
            popular={true}
            disabled={upgrading || !pkgs.annual}
            onPress={() => purchase('annual')}
          />

          <TouchableOpacity onPress={() => router.back()} style={styles.notNow} activeOpacity={0.8}>
            <Text style={styles.notNowText}>Not now</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function PlanCard(props: {
  title: string;
  subtitle: string;
  price: string;
  popular: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { title, subtitle, price, popular, disabled, onPress } = props;
  return (
    <TouchableOpacity
      style={[styles.planCard, popular && styles.planCardPopular, disabled && { opacity: 0.6 }]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      {popular ? (
        <View style={styles.popularPill}>
          <Text style={styles.popularText}>BEST VALUE</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <View>
          <Text style={styles.planTitle}>{title}</Text>
          <Text style={styles.planSub}>{subtitle}</Text>
        </View>
        <Text style={styles.planPrice}>{price}</Text>
      </View>
      <View style={styles.ctaRow}>
        <Ionicons name="sparkles" size={16} color="#16a34a" />
        <Text style={styles.ctaText}>Tap to upgrade</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ebf2fe' },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  headerSub: { marginTop: 2, fontSize: 12, fontWeight: '700', color: '#64748b' },
  hero: { marginBottom: 12 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  heroSub: { marginTop: 6, color: '#475569', fontWeight: '700', lineHeight: 19 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  muted: { marginTop: 8, color: '#64748b', fontWeight: '700', textAlign: 'center' },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  planCardPopular: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  popularPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  popularText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  planTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  planSub: { marginTop: 4, color: '#64748b', fontWeight: '700' },
  planPrice: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  ctaRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaText: { color: '#334155', fontWeight: '800' },
  notNow: { alignItems: 'center', paddingVertical: 12 },
  notNowText: { color: '#64748b', fontWeight: '800' },
  proTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  proSub: { marginTop: 6, color: '#64748b', fontWeight: '700', marginBottom: 12 },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '900' },
});


