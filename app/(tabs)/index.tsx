import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getTodayISO } from '@/utils/dates';
import { sendStepReminder } from '@/utils/notifications';
import { getBottomContentPadding } from '@/utils/layout';
import {
  Activity,
  Dumbbell,
  Utensils,
  Play,
  Heart,
  Moon,
  Users,
  TrendingUp,
  ChevronRight,
  TrendingDown,
  Timer,
  Info,
  Footprints,
  Gem,
  Zap,
  Locate,
  MessageSquare,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle,
  Music,
  ShoppingBag,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;

export default function IndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

  const todayISO = useMemo(() => getTodayISO(), []);

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const foodTotals = useQuery(
    api.food.getDailyTotals,
    convexUser?._id ? { userId: convexUser._id, date: todayISO } : 'skip'
  );

  const caloriesBurned = useQuery(
    api.exercise.getTotalCaloriesBurned,
    convexUser?._id ? { userId: convexUser._id, date: todayISO } : 'skip'
  );

  const exerciseEntries = useQuery(
    api.exercise.getExerciseEntriesByDate,
    convexUser?._id ? { userId: convexUser._id, date: todayISO } : 'skip'
  );

  const sleepLogsToday = useQuery(
    api.wellness.getSleepLogs,
    convexUser?._id ? { userId: convexUser._id, startDate: todayISO, endDate: todayISO } : 'skip'
  );

  const stepEntriesToday = useQuery(
    api.steps.getStepsEntriesByDate,
    convexUser?._id ? { userId: convexUser._id, date: todayISO } : 'skip'
  );

  const isLoading =
    !isClerkLoaded ||
    (clerkUser && convexUser === undefined) ||
    (convexUser?._id &&
      (foodTotals === undefined ||
        caloriesBurned === undefined ||
        exerciseEntries === undefined ||
        sleepLogsToday === undefined));

  const steps = useMemo(() => {
    if (!stepEntriesToday) return 0;
    return stepEntriesToday.reduce((acc, entry) => acc + entry.steps, 0);
  }, [stepEntriesToday]);

  const exerciseMinutes = useMemo(() => {
    if (!exerciseEntries) return 0;
    return Math.round(
      exerciseEntries.reduce((acc: number, e: { duration?: number }) => acc + (e.duration ?? 0), 0)
    );
  }, [exerciseEntries]);

  const sleepHours = useMemo(() => {
    if (!sleepLogsToday || sleepLogsToday.length === 0) return 0;
    // pick latest by timestamp if present
    const sorted = [...sleepLogsToday].sort(
      (a: { timestamp?: number }, b: { timestamp?: number }) => (a.timestamp ?? 0) - (b.timestamp ?? 0)
    );
    const latest = sorted.length > 0 ? sorted[sorted.length - 1] : undefined;
    return latest?.hours ?? 0;
  }, [sleepLogsToday]);

  // Trigger notifications when data changes
  useEffect(() => {
    const stepGoal = 10000;
    if (steps > 0 && steps < stepGoal) {
      sendStepReminder(steps, stepGoal);
    }
  }, [steps]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!clerkUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Please sign in to continue</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!convexUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Setting up your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasCompletedOnboarding = convexUser.age > 0 && convexUser.weight > 0 && convexUser.height > 0;
  if (!hasCompletedOnboarding) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Finish onboarding to see your Home dashboard.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const goalCalories = convexUser?.dailyCalories ?? 2000;
  const goalProtein = convexUser?.dailyProtein ?? 150;
  const goalCarbs = convexUser?.dailyCarbs ?? 225;
  const goalFat = convexUser?.dailyFat ?? 67;

  const todayFoodCalories = foodTotals?.calories ?? 0;
  const todayProtein = foodTotals?.protein ?? 0;
  const todayCarbs = foodTotals?.carbs ?? 0;
  const todayFat = foodTotals?.fat ?? 0;

  const burned = caloriesBurned ?? 0;
  const remainingCalories = goalCalories - todayFoodCalories + burned;

  const isPremiumActive = Boolean(convexUser.isPremium && (!convexUser.premiumExpiry || convexUser.premiumExpiry > Date.now()));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const todayStats = [
    {
      Icon: Footprints,
      label: 'Steps',
      value: steps.toLocaleString(),
      target: '10,000',
      color: '#2563eb',
      bgColor: '#dbeafe',
    },
    {
      Icon: Dumbbell,
      label: 'Exercise',
      value: `${exerciseMinutes}min`,
      target: '30min',
      color: '#16a34a',
      bgColor: '#dcfce7',
    },
    {
      Icon: Zap,
      label: 'Calories Burned',
      value: `${burned}`,
      target: '400',
      color: '#f59e0b',
      bgColor: '#fef3c7',
    },
    {
      Icon: Moon,
      label: 'Sleep',
      value: `${Math.round(sleepHours * 10) / 10}h`,
      target: '8h',
      color: '#8b5cf6',
      bgColor: '#ede9fe',
    },
  ] as const;

  const discoveryItems = [
    { Icon: MessageSquare, label: 'AI Coach', path: '/ai-coach', color: '#2563eb', bgColor: '#eff6ff' },
    { Icon: Calendar, label: 'Cycle', path: '/womens-health', color: '#db2777', bgColor: '#fdf2f8' },
    { Icon: Zap, label: 'Vitality', path: '/mens-health', color: '#3b82f6', bgColor: '#eff6ff' },
    { Icon: Clock, label: 'Fasting', path: '/fasting', color: '#f59e0b', bgColor: '#fffbeb' },
    { Icon: BookOpen, label: 'Library', path: '/library', color: '#10b981', bgColor: '#ecfdf5' },
    { Icon: CheckCircle, label: 'Todos', path: '/todo-list', color: '#8b5cf6', bgColor: '#f5f3ff' },
    
    { Icon: Music, label: 'Radio', path: '/music-hub', color: '#8b5cf6', bgColor: '#f5f3ff' },
    { Icon: Timer, label: 'Focus', path: '/focus-mode', color: '#3b82f6', bgColor: '#eff6ff' },
    { Icon: ShoppingBag, label: 'Shop', path: '/shop', color: '#2563eb', bgColor: '#eff6ff' },
    { Icon: Utensils, label: 'Recipes', path: '/recipes', color: '#f97316', bgColor: '#fff7ed' },
    { Icon: Play, label: 'Workouts', path: '/workouts', color: '#16a34a', bgColor: '#f0fdf4' },
    { Icon: TrendingDown, label: 'Sugar', path: '/sugar-dashboard', color: '#ef4444', bgColor: '#fee2e2' },
  ] as const;

  const discoveryPages = [
    discoveryItems.slice(0, 6),
    discoveryItems.slice(6, 12),
  ];

  // Weekly chart data (mock data for now)
  const weekData = [1, 3, 2, 4, 3, 5, 4];
  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12) + 12,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 12 }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.greeting}>
                {getGreeting()}, {convexUser?.name ?? 'User'}!
              </Text>
              <Text style={styles.subtitle}>Ready to crush your goals today?</Text>
            </View>
            <TouchableOpacity
              style={styles.premiumButtonSmall}
              onPress={() => {
                router.push('/premium');
              }}
              activeOpacity={0.7}
            >
              <Gem size={20} color="#f97316" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Balance Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Today&apos;s Balance</Text>
            <Locate size={24} color="#2563eb" />
          </View>

          <View style={styles.balanceGrid}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Goal</Text>
              <Text style={styles.balanceValue} numberOfLines={1} adjustsFontSizeToFit>
                {Math.round(goalCalories)}
              </Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Food</Text>
              <Text
                style={[styles.balanceValue, { color: '#16a34a' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {Math.round(todayFoodCalories)}
              </Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Exercise</Text>
              <Text
                style={[styles.balanceValue, { color: '#f97316' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {Math.round(burned)}
              </Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Remaining</Text>
              <Text
                style={[
                  styles.balanceValue,
                  { color: remainingCalories > 0 ? '#2563eb' : '#dc2626' },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {Math.round(remainingCalories)}
              </Text>
            </View>
          </View>
        </View>

        {/* Macros Today Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Macros Today</Text>

          <View style={styles.macrosGrid}>
            <View style={styles.macroItem}>
              <View style={[styles.macroCircle, { backgroundColor: '#fee2e2' }]}>
                <Text
                  style={[styles.macroValue, { color: '#dc2626' }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {Math.round(todayProtein)}g
                </Text>
              </View>
              <Text style={styles.macroLabel} numberOfLines={1} adjustsFontSizeToFit>
                Protein
              </Text>
              <Text style={styles.macroGoal} numberOfLines={1} adjustsFontSizeToFit>
                {Math.round(goalProtein)}g goal
              </Text>
            </View>

            <View style={styles.macroItem}>
              <View style={[styles.macroCircle, { backgroundColor: '#dbeafe' }]}>
                <Text
                  style={[styles.macroValue, { color: '#2563eb' }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {Math.round(todayCarbs)}g
                </Text>
              </View>
              <Text style={styles.macroLabel} numberOfLines={1} adjustsFontSizeToFit>
                Carbs
              </Text>
              <Text style={styles.macroGoal} numberOfLines={1} adjustsFontSizeToFit>
                {Math.round(goalCarbs)}g goal
              </Text>
            </View>

            <View style={styles.macroItem}>
              <View style={[styles.macroCircle, { backgroundColor: '#fef3c7' }]}>
                <Text
                  style={[styles.macroValue, { color: '#d97706' }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {Math.round(todayFat)}g
                </Text>
              </View>
              <Text style={styles.macroLabel} numberOfLines={1} adjustsFontSizeToFit>
                Fat
              </Text>
              <Text style={styles.macroGoal} numberOfLines={1} adjustsFontSizeToFit>
                {Math.round(goalFat)}g goal
              </Text>
            </View>
          </View>
        </View>

        {/* Today's Stats */}
        <View style={styles.statsContainer}>
          {todayStats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: stat.bgColor }]}>
                <stat.Icon size={24} color={stat.color} />
              </View>
              <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>
                {stat.label}
              </Text>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                {stat.value}
              </Text>
              <Text style={styles.statTarget} numberOfLines={1} adjustsFontSizeToFit>
                of {stat.target}
              </Text>
            </View>
          ))}
        </View>

        {/* Weekly Activity Chart */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>This Week</Text>
            <TrendingUp size={24} color="#16a34a" />
          </View>

          <View style={styles.chartContainer}>
            {weekData.map((height, index) => (
              <View key={index} style={styles.chartItem}>
                <View style={[styles.chartBar, { height: height * 20 }]} />
                <Text style={styles.chartDay}>{weekDays[index]}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.chartLabel}>Calories burned this week</Text>
        </View>

        {/* Discover Section (Carousel) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Discovery</Text>
            <TouchableOpacity onPress={() => Alert.alert('Precision Modules', 'All precision health hubs are active.')}>
              <Text style={{ color: '#2563eb', fontWeight: '800', fontSize: 12 }}>See All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 10 }}
          >
            {discoveryPages.map((page, pageIdx) => (
              <View key={pageIdx} style={{ width: width - 64, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {page.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={{ width: '30%', alignItems: 'center', marginBottom: 20 }}
                    onPress={() => item.path && router.push(item.path as any)}
                    activeOpacity={0.7}
                  >
                    <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: item.bgColor, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                      <item.Icon size={22} color={item.color} />
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#475569' }} numberOfLines={1}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
          
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
            {discoveryPages.map((_, i) => (
              <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#cbd5e1' }} />
            ))}
          </View>
        </View>

        {/* Premium Promo */}
        {!isPremiumActive && (
          <TouchableOpacity
            style={styles.premiumBanner}
            onPress={() => router.push('/premium')}
            activeOpacity={0.8}
          >
            <View style={styles.premiumBannerContent}>
              <View style={styles.premiumBannerTextContainer}>
                <Text style={styles.premiumBannerTitle}>Go Premium</Text>
                <Text style={styles.premiumBannerText} numberOfLines={3} adjustsFontSizeToFit>
                  Unlock unlimited workouts,{'\n'}personalized plans, and{'\n'}advanced analytics
                </Text>
              </View>
              <View style={styles.premiumBannerButton}>
                <ChevronRight size={24} color="#ffffff" />
              </View>
            </View>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ebf2fe',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  premiumButtonSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  balanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  balanceLabel: {
    fontSize: isSmallScreen ? 10 : 12,
    color: '#64748b',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: isSmallScreen ? 16 : 20,
    fontWeight: 'bold',
    color: '#1e293b',
    minHeight: isSmallScreen ? 20 : 24,
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  macroCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroValue: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: 'bold',
    minHeight: 18,
  },
  macroLabel: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#64748b',
    marginBottom: 2,
    minHeight: 16,
  },
  macroGoal: {
    fontSize: isSmallScreen ? 10 : 12,
    color: '#94a3b8',
    minHeight: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 64) / 2,
    backgroundColor: '#ffffff',
    padding: isSmallScreen ? 12 : 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: isSmallScreen ? 10 : 12,
    color: '#64748b',
    marginBottom: 4,
    minHeight: 14,
  },
  statValue: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
    minHeight: isSmallScreen ? 22 : 24,
  },
  statTarget: {
    fontSize: isSmallScreen ? 10 : 12,
    color: '#94a3b8',
    minHeight: 14,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 128,
    marginBottom: 8,
  },
  chartItem: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: 24,
    backgroundColor: '#2563eb',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    marginBottom: 8,
    minHeight: 8,
  },
  chartDay: {
    fontSize: 12,
    color: '#64748b',
  },
  chartLabel: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  discoverGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  discoverItem: {
    width: (width - 96) / 3,
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  discoverIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  discoverLabel: {
    fontSize: 12,
    color: '#1e293b',
    textAlign: 'center',
  },
  premiumBanner: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#f97316',
    padding: 24,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  premiumBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  premiumBannerTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  premiumBannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  premiumBannerText: {
    fontSize: isSmallScreen ? 11 : 13,
    color: '#ffffff',
    opacity: 0.9,
    lineHeight: isSmallScreen ? 16 : 18,
    minHeight: isSmallScreen ? 48 : 54,
  },
  premiumBannerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 20,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});
