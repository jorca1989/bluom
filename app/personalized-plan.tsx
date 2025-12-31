import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getBottomContentPadding } from '@/utils/layout';
import { Ionicons } from '@expo/vector-icons';
import { useAccessControl } from '@/hooks/useAccessControl';

export default function PersonalizedPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const { isPro, promptUpgrade } = useAccessControl();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const plans = useQuery(
    api.plans.getActivePlans,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  );

  const regenerate = useMutation(api.plans.generateAllPlans);

  const isLoading = clerkUser && (convexUser === undefined || (convexUser?._id && plans === undefined));

  const canGenerate = useMemo(() => Boolean(convexUser?._id), [convexUser?._id]);

  if (!isLoading && !isPro) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Plan</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: getBottomContentPadding(insets.bottom, 20) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { borderColor: '#fde68a', backgroundColor: '#fffbeb' }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="lock-closed" size={20} color="#f59e0b" />
              </View>
              <Text style={styles.cardTitle}>Premium Module</Text>
            </View>
            <Text style={styles.heroSubtitle}>
              Your Personalized Plan hub unlocks with Pro. Upgrade to see your nutrition, fitness, and wellness plans.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#f59e0b', marginTop: 10 }]}
              onPress={() => promptUpgrade('Unlock Personalized Plans with Pro.')}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading your personalized plans…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: getBottomContentPadding(insets.bottom, 20) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{convexUser?.name ? `Hey ${convexUser.name}` : 'Your Plan'}</Text>
            <Text style={styles.heroSubtitle}>
              Generated from your onboarding profile. You can regenerate anytime.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, (!canGenerate || !isPro) && { opacity: 0.6 }]}
              disabled={!canGenerate || !isPro}
              onPress={async () => {
                if (!convexUser?._id) return;
                if (!isPro) {
                  promptUpgrade('Regenerating plans is available for Pro members.');
                  return;
                }
                try {
                  await regenerate({ userId: convexUser._id });
                } catch (e) {
                  // eslint-disable-next-line no-console
                  console.error(e);
                }
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Regenerate Plans</Text>
            </TouchableOpacity>
          </View>

          <PlanCard title="Nutrition Plan" icon="nutrition" color="#f59e0b">
            {plans?.nutritionPlan ? (
              <>
                <Row label="Daily Calories" value={`${Math.round(plans.nutritionPlan.calorieTarget)} cal`} />
                <Row label="Protein" value={`${Math.round(plans.nutritionPlan.proteinTarget)}g`} />
                <Row label="Carbs" value={`${Math.round(plans.nutritionPlan.carbsTarget)}g`} />
                <Row label="Fat" value={`${Math.round(plans.nutritionPlan.fatTarget)}g`} />
                <Text style={styles.smallTitle}>Meal templates</Text>
                {(plans.nutritionPlan.mealTemplates ?? []).slice(0, 4).map((m: any, idx: number) => (
                  <View key={idx} style={styles.pillRow}>
                    <Text style={styles.pill}>{String(m.mealType).toUpperCase()}</Text>
                    <Text style={styles.pillText}>
                      {Math.round(m.calories)} cal • P{Math.round(m.protein)} C{Math.round(m.carbs)} F{Math.round(m.fat)}
                    </Text>
                  </View>
                ))}
              </>
            ) : (
              <Text style={styles.emptyText}>No nutrition plan yet. Tap “Regenerate Plans”.</Text>
            )}
          </PlanCard>

          <PlanCard title="Fitness Plan" icon="barbell" color="#16a34a">
            {plans?.fitnessPlan ? (
              <>
                <Row label="Split" value={plans.fitnessPlan.workoutSplit} />
                <Row label="Days / Week" value={`${Math.round(plans.fitnessPlan.daysPerWeek)}x`} />
                <Text style={styles.smallTitle}>Schedule</Text>
                {(plans.fitnessPlan.workouts ?? []).slice(0, 5).map((w: any, idx: number) => (
                  <View key={idx} style={styles.scheduleRow}>
                    <Text style={styles.scheduleDay}>{w.day}</Text>
                    <Text style={styles.scheduleFocus} numberOfLines={1}>
                      {w.focus} • ~{Math.round(w.estimatedDuration)}m
                    </Text>
                  </View>
                ))}
              </>
            ) : (
              <Text style={styles.emptyText}>No fitness plan yet. Tap “Regenerate Plans”.</Text>
            )}
          </PlanCard>

          <PlanCard title="Wellness Plan" icon="heart" color="#8b5cf6">
            {plans?.wellnessPlan ? (
              <>
                <Text style={styles.smallTitle}>Recommended habits</Text>
                {(plans.wellnessPlan.recommendedHabits ?? []).slice(0, 6).map((h: any, idx: number) => (
                  <View key={idx} style={styles.habitRow}>
                    <Text style={styles.habitName}>{h.name}</Text>
                    <Text style={styles.habitMeta}>{h.category}</Text>
                  </View>
                ))}
                <Text style={[styles.smallTitle, { marginTop: 10 }]}>Sleep</Text>
                <Text style={styles.paragraph}>
                  Target: {Math.round(plans.wellnessPlan.sleepRecommendation?.targetHours ?? 0)}h •{' '}
                  {plans.wellnessPlan.sleepRecommendation?.bedTimeWindow ?? '—'}
                </Text>
              </>
            ) : (
              <Text style={styles.emptyText}>No wellness plan yet. Tap “Regenerate Plans”.</Text>
            )}
          </PlanCard>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function PlanCard({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: any;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBadge, { backgroundColor: `${color}22` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#64748b', fontWeight: '600' },
  hero: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginBottom: 6 },
  heroSubtitle: { color: '#64748b', lineHeight: 18, marginBottom: 12 },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '800' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconBadge: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { color: '#64748b', fontWeight: '700' },
  rowValue: { color: '#1e293b', fontWeight: '800' },
  smallTitle: { marginTop: 8, marginBottom: 6, color: '#334155', fontWeight: '900' },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  pill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: '900',
    color: '#475569',
    fontSize: 11,
  },
  pillText: { color: '#64748b', fontWeight: '700', flex: 1 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  scheduleDay: { color: '#1e293b', fontWeight: '900', width: 90 },
  scheduleFocus: { color: '#64748b', fontWeight: '700', flex: 1, textAlign: 'right' },
  habitRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  habitName: { color: '#1e293b', fontWeight: '800', flex: 1, paddingRight: 10 },
  habitMeta: { color: '#64748b', fontWeight: '700' },
  paragraph: { color: '#64748b', lineHeight: 18, fontWeight: '600' },
  emptyText: { color: '#94a3b8', fontWeight: '700' },
});









