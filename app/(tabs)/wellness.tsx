import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import MeditationHub from '../../components/MeditationHub';
import GamesHub from '../../components/GamesHub';
import MindWorldScreen from '../../components/mindworld/MindWorldScreen';
import PanicButton from '../../components/PanicButton';
import { SoundEffect, triggerSound } from '../../utils/soundEffects';
import { SparkleEffect, GlowView } from '../../components/MicroInteractions';
import { getBottomContentPadding } from '../../utils/layout';
import { Doc, Id } from '../../convex/_generated/dataModel';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;

const moods = [
  { label: 'Excellent', value: 5, color: '#16a34a', icon: 'happy' },
  { label: 'Good', value: 4, color: '#3b82f6', icon: 'happy-outline' },
  { label: 'Okay', value: 3, color: '#eab308', icon: 'remove-circle-outline' },
  { label: 'Low', value: 2, color: '#f97316', icon: 'sad-outline' },
  { label: 'Poor', value: 1, color: '#dc2626', icon: 'sad' },
];

const habitCategories = ['health', 'fitness', 'mindfulness', 'social', 'learning'] as const;
type HabitCategory = (typeof habitCategories)[number];
const categoryLabels: Record<string, string> = {
  health: 'Health',
  fitness: 'Fitness',
  mindfulness: 'Mindfulness',
  social: 'Social',
  learning: 'Learning',
};

function toDisplayCategory(cat: string): HabitCategory {
  if (cat === 'routine') return 'health';
  if (cat === 'physical') return 'fitness';
  if (cat === 'mental') return 'mindfulness';
  if (habitCategories.includes(cat as HabitCategory)) return cat as HabitCategory;
  return 'health';
}

const iconOptions = [
  { name: 'Target', iconName: 'locate' },
  { name: 'Droplets', iconName: 'water' },
  { name: 'Pill', iconName: 'medical' },
  { name: 'Book', iconName: 'book' },
  { name: 'Leaf', iconName: 'leaf' },
  { name: 'Zap', iconName: 'flash' },
  { name: 'Coffee', iconName: 'cafe' },
  { name: 'Apple', iconName: 'nutrition' },
  { name: 'Dumbbell', iconName: 'barbell' },
  { name: 'Phone', iconName: 'phone-portrait' },
  { name: 'Users', iconName: 'people' },
  { name: 'Music', iconName: 'musical-notes' },
  { name: 'Camera', iconName: 'camera' },
  { name: 'Heart', iconName: 'heart' },
  { name: 'Brain', iconName: 'fitness' },
  { name: 'Sun', iconName: 'sunny' },
  { name: 'Moon', iconName: 'moon' }
];

// DEV: Temporarily unlock all Insights metrics (ignore Premium locks).
// Flip to false when you're ready to enforce Premium gating again.
const UNLOCK_ALL_INSIGHTS = true;

const DEFAULT_HABITS: Array<{
  name: string;
  icon: string;
  displayCategory: HabitCategory;
  backendCategory: 'routine' | 'physical' | 'mental';
  targetDaysPerWeek: number;
}> = [
    { name: 'Drink 8 glasses of water', icon: 'Droplets', displayCategory: 'health', backendCategory: 'routine', targetDaysPerWeek: 7 },
    { name: 'Take daily vitamins', icon: 'Pill', displayCategory: 'health', backendCategory: 'routine', targetDaysPerWeek: 7 },
    { name: 'Spend time in nature', icon: 'Leaf', displayCategory: 'health', backendCategory: 'routine', targetDaysPerWeek: 5 },
    { name: 'Get 8 hours of sleep', icon: 'Moon', displayCategory: 'health', backendCategory: 'routine', targetDaysPerWeek: 7 },
    { name: 'Limit screen time', icon: 'Phone', displayCategory: 'health', backendCategory: 'routine', targetDaysPerWeek: 7 },
    { name: 'Exercise for 30 minutes', icon: 'Dumbbell', displayCategory: 'fitness', backendCategory: 'physical', targetDaysPerWeek: 4 },
    { name: 'Meditate for 10 minutes', icon: 'Brain', displayCategory: 'mindfulness', backendCategory: 'mental', targetDaysPerWeek: 5 },
    { name: 'Practice gratitude', icon: 'Heart', displayCategory: 'mindfulness', backendCategory: 'mental', targetDaysPerWeek: 5 },
    { name: 'Connect with friends/family', icon: 'Users', displayCategory: 'social', backendCategory: 'mental', targetDaysPerWeek: 3 },
    { name: 'Read for 30 minutes', icon: 'Book', displayCategory: 'learning', backendCategory: 'mental', targetDaysPerWeek: 4 },
  ];

function displayToBackendCategory(cat: HabitCategory): 'routine' | 'physical' | 'mental' {
  if (cat === 'fitness') return 'physical';
  if (cat === 'mindfulness' || cat === 'social' || cat === 'learning') return 'mental';
  return 'routine'; // health default
}

export default function WellnessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const user = useQuery(api.users.getUserByClerkId, clerkUser ? { clerkId: clerkUser.id } : "skip");

  const today = new Date().toISOString().split('T')[0];
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const startDate = startOfWeek.toISOString().split('T')[0];

  // Queries
  const habits = useQuery(api.habits.getUserHabitsForDate, user ? { userId: user._id, date: today } : "skip");
  const weeklySleepStats = useQuery(api.wellness.getWeeklySleepStats, user ? { userId: user._id, startDate, endDate: today } : "skip");
  const sleepLogs = useQuery(api.wellness.getSleepLogs, user ? { userId: user._id, startDate, endDate: today } : "skip");
  const moodLogs = useQuery(api.wellness.getMoodLogs, user ? { userId: user._id, startDate, endDate: today } : "skip");
  const meditationLogs = useQuery(api.wellness.getMeditationLogs, user ? { userId: user._id, limit: 100 } : "skip");
  const gratitudeEntries = useQuery(api.aimind.getGratitudeEntries, user ? { userId: user._id } : "skip");
  const journalEntries = useQuery(api.aimind.getJournalEntries, user ? { userId: user._id } : "skip");
  const insights = useQuery(api.aimind.getWellnessInsights, user ? { userId: user._id } : "skip");

  // Mutations
  const logMood = useMutation(api.wellness.logMood);
  const logSleep = useMutation(api.wellness.logSleep);
  const toggleHabit = useMutation(api.habits.toggleHabitForDate);
  const createHabit = useMutation(api.habits.createHabit);
  const deleteHabitMutation = useMutation(api.habits.deleteHabit);
  const saveGratitudeMutation = useMutation(api.aimind.saveGratitude);
  const saveJournalMutation = useMutation(api.aimind.saveJournal);
  const createInitialQuests = useMutation(api.quests.createInitialQuests);

  // Local State
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [showGratitudeModal, setShowGratitudeModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [showMeditationHub, setShowMeditationHub] = useState(false);
  const [showGamesHub, setShowGamesHub] = useState(false);
  const [showMindWorld, setShowMindWorld] = useState(false);
  const [insightDetail, setInsightDetail] = useState<null | { key: string; title: string }>(null);

  const [sleepInput, setSleepInput] = useState('');
  const [sleepQualityInput, setSleepQualityInput] = useState('80');
  const [newHabit, setNewHabit] = useState({
    name: '',
    icon: 'Target',
    category: 'health' as typeof habitCategories[number],
    targetDays: 7
  });

  const [gratitudeEntry, setGratitudeEntry] = useState('');
  const [gratitudeLines, setGratitudeLines] = useState<string[]>(['', '', '']);
  const [gratitudePrompt, setGratitudePrompt] = useState<string>('What made you smile today?');
  const [gratitudeSparkle, setGratitudeSparkle] = useState(false);
  const [gratitudeGlow, setGratitudeGlow] = useState(false);
  const [journalContent, setJournalContent] = useState('');
  const [showAllHabits, setShowAllHabits] = useState(false);
  const [sparkleTrigger, setSparkleTrigger] = useState<string | null>(null);
  const [glowTrigger, setGlowTrigger] = useState(false);

  useEffect(() => {
    if (!user) return;
    createInitialQuests({ userId: user._id, date: today }).catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, today]);

  // Seed defaults (client-side) for deployments that don't yet have server-side seeding.
  useEffect(() => {
    if (!user?._id) return;
    if (!habits) return;
    if (habits.length > 0) return;

    // Fire-and-forget creation; on next query refresh, they'll appear.
    (async () => {
      try {
        for (const h of DEFAULT_HABITS) {
          await createHabit({
            userId: user._id,
            name: h.name,
            icon: h.icon,
            category: h.backendCategory as any,
            targetDaysPerWeek: h.targetDaysPerWeek,
          });
        }
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, habits]);

  // Derived State
  const todayMood = useMemo(() => {
    if (!moodLogs) return null;
    return moodLogs.find(log => log.date === today);
  }, [moodLogs, today]);

  const todaySleep = useMemo(() => {
    if (!sleepLogs) return null;
    return sleepLogs.find(log => log.date === today);
  }, [sleepLogs, today]);

  const completedHabitsToday = habits ? habits.filter(h => h.completedToday).length : 0;
  const totalHabits = habits ? habits.length : 0;
  const completionPercentage = totalHabits > 0 ? Math.round((completedHabitsToday / totalHabits) * 100) : 0;

  const isPremiumActive = useMemo(() => {
    if (UNLOCK_ALL_INSIGHTS) return true;
    return Boolean(user?.isPremium && (!user?.premiumExpiry || user.premiumExpiry > Date.now()));
  }, [user?.isPremium, user?.premiumExpiry]);

  const last7Dates = useMemo(() => {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, [today]);

  const weekDayLabels = useMemo(() => ['M', 'T', 'W', 'T', 'F', 'S', 'S'], []);

  const calcStd = (vals: number[]) => {
    const xs = vals.filter((v) => Number.isFinite(v) && v > 0);
    if (xs.length <= 1) return 0;
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const variance = xs.reduce((acc, x) => acc + (x - mean) ** 2, 0) / xs.length;
    return Math.sqrt(variance);
  };

  const sleepByDate = useMemo(() => {
    const map = new Map<string, { hours: number; quality: number }>();
    (sleepLogs ?? []).forEach((s: any) => {
      const prev = map.get(s.date);
      if (!prev) map.set(s.date, { hours: s.hours ?? 0, quality: s.quality ?? 0 });
      else map.set(s.date, { hours: s.hours ?? 0, quality: s.quality ?? 0 });
    });
    return map;
  }, [sleepLogs]);

  const moodByDate = useMemo(() => {
    const map = new Map<string, number>();
    (moodLogs ?? []).forEach((m: any) => map.set(m.date, m.mood ?? 0));
    return map;
  }, [moodLogs]);

  const sleepHoursTrend = useMemo(() => last7Dates.map((d) => sleepByDate.get(d)?.hours ?? 0), [last7Dates, sleepByDate]);
  const sleepQualityTrend = useMemo(() => last7Dates.map((d) => sleepByDate.get(d)?.quality ?? 0), [last7Dates, sleepByDate]);
  const moodTrend = useMemo(() => last7Dates.map((d) => moodByDate.get(d) ?? 0), [last7Dates, moodByDate]);

  const sleepAvg = useMemo(() => {
    const xs = sleepHoursTrend.filter((v) => v > 0);
    if (xs.length === 0) return 0;
    return Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
  }, [sleepHoursTrend]);

  const sleepQualityAvg = useMemo(() => {
    const xs = sleepQualityTrend.filter((v) => v > 0);
    if (xs.length === 0) return 0;
    return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  }, [sleepQualityTrend]);

  const goodNights = useMemo(() => sleepHoursTrend.filter((h) => h >= 7).length, [sleepHoursTrend]);
  const sleepConsistency = useMemo(() => Math.round(calcStd(sleepHoursTrend) * 10) / 10, [sleepHoursTrend]);

  const moodAvg = useMemo(() => {
    const xs = moodTrend.filter((v) => v > 0);
    if (xs.length === 0) return 0;
    return Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
  }, [moodTrend]);

  const moodStability = useMemo(() => {
    const std = calcStd(moodTrend);
    // convert to 0-100 where lower std = more stable (max meaningful std ~2)
    const score = Math.max(0, Math.min(100, Math.round((1 - Math.min(std, 2) / 2) * 100)));
    return score;
  }, [moodTrend]);

  const meditationMinutes7d = useMemo(() => {
    if (!meditationLogs) return 0;
    const set = new Set(last7Dates);
    const sum = meditationLogs.reduce((acc: number, m: any) => {
      if (!set.has(m.date)) return acc;
      return acc + (m.durationMinutes ?? 0);
    }, 0);
    return Math.round(sum);
  }, [meditationLogs, last7Dates]);

  const gratitudeCount7d = useMemo(() => {
    if (!gratitudeEntries) return 0;
    const set = new Set(last7Dates);
    return gratitudeEntries.filter((g: any) => set.has(g.date)).length;
  }, [gratitudeEntries, last7Dates]);

  const journalCount7d = useMemo(() => {
    if (!journalEntries) return 0;
    const set = new Set(last7Dates);
    return journalEntries.filter((j: any) => set.has(j.date)).length;
  }, [journalEntries, last7Dates]);

  const topHabitsByStreak = useMemo(() => {
    if (!habits) return [];
    return [...habits].sort((a: any, b: any) => (b.streak ?? 0) - (a.streak ?? 0)).slice(0, 3);
  }, [habits]);

  const openMetric = (key: string, title: string, locked: boolean) => {
    if (!UNLOCK_ALL_INSIGHTS && locked) {
      Alert.alert(
        'Premium feature',
        'Upgrade to Premium to unlock detailed wellness insights, mood analysis, and personalized recommendations.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/premium') }
        ]
      );
      return;
    }
    setInsightDetail({ key, title });
  };

  const visibleHabitIds = useMemo(() => {
    if (!habits) return new Set<string>();
    if (showAllHabits) return new Set(habits.map((h) => h._id));
    const ordered = [...habits].sort((a, b) => {
      const aCat = toDisplayCategory(a.category);
      const bCat = toDisplayCategory(b.category);
      const aIdx = habitCategories.indexOf(aCat);
      const bIdx = habitCategories.indexOf(bCat);
      if (aIdx !== bIdx) return aIdx - bIdx;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
    return new Set(ordered.slice(0, 5).map((h) => h._id));
  }, [habits, showAllHabits]);

  // Handlers
  const handleAddSleep = async () => {
    if (!user || !sleepInput) return;
    try {
      await logSleep({
        userId: user._id,
        hours: parseFloat(sleepInput),
        quality: parseFloat(sleepQualityInput),
        date: today
      });
      setSleepInput('');
      setShowSleepModal(false);
      setGlowTrigger(true);
      setTimeout(() => setGlowTrigger(false), 2000);
      triggerSound(SoundEffect.WELLNESS_LOG);
    } catch (e) {
      Alert.alert('Error', 'Failed to log sleep');
    }
  };

  const handleLogMood = async (moodValue: number) => {
    if (!user) return;
    try {
      triggerSound(SoundEffect.WELLNESS_LOG);
      await logMood({
        userId: user._id,
        mood: moodValue as any,
        date: today
      });
      setShowMoodModal(false);
      triggerSound(SoundEffect.WELLNESS_LOG);
    } catch (e) {
      Alert.alert('Error', 'Failed to log mood');
    }
  };

  const handleToggleHabit = async (habitId: Id<"habits">) => {
    try {
      const res = await toggleHabit({ habitId, date: today });
      if (res.completed) {
        setSparkleTrigger(habitId);
        setTimeout(() => setSparkleTrigger(null), 1000);
        triggerSound(SoundEffect.WELLNESS_LOG);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to toggle habit');
    }
  };

  const handleAddCustomHabit = async () => {
    if (!user || !newHabit.name.trim()) return;
    try {
      await createHabit({
        userId: user._id,
        name: newHabit.name,
        icon: newHabit.icon,
        category: displayToBackendCategory(newHabit.category) as any,
        targetDaysPerWeek: newHabit.targetDays
      });
      setNewHabit({ name: '', icon: 'Target', category: 'health', targetDays: 7 });
      setShowHabitModal(false);
      Alert.alert('Success', 'Habit added!');
    } catch (e) {
      Alert.alert('Error', 'Failed to add habit');
    }
  };

  const handleDeleteHabit = (habitId: Id<"habits">) => {
    Alert.alert('Delete Habit', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteHabitMutation({ habitId }) }
    ]);
  };

  const handleSaveGratitude = async () => {
    if (!user) return;
    try {
      const payloads: string[] = [];
      const freeform = gratitudeEntry.trim();
      if (freeform) payloads.push(freeform);
      gratitudeLines.forEach((l) => {
        const t = l.trim();
        if (t) payloads.push(t);
      });
      const unique = Array.from(new Set(payloads)).slice(0, 5);
      if (unique.length === 0) return;

      setGratitudeGlow(true);
      setGratitudeSparkle(true);
      triggerSound(SoundEffect.WELLNESS_LOG);

      for (const entry of unique) {
        await saveGratitudeMutation({
          userId: user._id,
          entry,
          date: today,
        });
      }

      setGratitudeEntry('');
      setGratitudeLines(['', '', '']);
      setTimeout(() => setGratitudeSparkle(false), 900);
      setTimeout(() => setGratitudeGlow(false), 1400);
      setShowGratitudeModal(false);
      Alert.alert('Success', 'Gratitude saved!');
    } catch (e) {
      Alert.alert('Error', 'Failed to save gratitude');
    }
  };

  const handleSaveJournal = async () => {
    if (!user || !journalContent.trim()) return;
    try {
      await saveJournalMutation({
        userId: user._id,
        content: journalContent,
        moodTag: todayMood ? moods.find(m => m.value === todayMood.mood)?.label : undefined,
        date: today
      });
      setJournalContent('');
      setShowJournalModal(false);
      Alert.alert('Success', 'Journal saved!');
    } catch (e) {
      Alert.alert('Error', 'Failed to save journal');
    }
  };

  const getIconName = (iconName: string) => {
    const iconOption = iconOptions.find(option => option.name === iconName);
    return iconOption ? iconOption.iconName : 'locate';
  };

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 12, // Standard offset within header
            paddingBottom: Math.max(insets.bottom, 12) + 12, // Standard 24px bottom
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 12 }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Wellness</Text>
              <Text style={styles.subtitle}>Track your sleep, mood & daily habits</Text>
            </View>
            <TouchableOpacity
              style={[styles.headerButton, styles.plusButton]}
              onPress={() => setShowDropdown(!showDropdown)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Plus Menu */}
        {showDropdown && (
          <View style={styles.plusMenu}>
            <TouchableOpacity style={styles.plusMenuItem} onPress={() => { setShowSleepModal(true); setShowDropdown(false); }}>
              <Ionicons name="moon" size={20} color="#8b5cf6" />
              <Text style={styles.plusMenuText}>Log Sleep</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.plusMenuItem} onPress={() => { setShowMoodModal(true); setShowDropdown(false); }}>
              <Ionicons name="happy-outline" size={20} color="#eab308" />
              <Text style={styles.plusMenuText}>Log Mood</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Summary Grid */}
        <View style={styles.summaryGrid}>
          <GlowView visible={glowTrigger} color="#8b5cf6" style={styles.summaryCardWrapper}>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIconContainer, { backgroundColor: '#ede9fe' }]}>
                <Ionicons name="moon" size={24} color="#8b5cf6" />
              </View>
              <Text style={styles.summaryLabel} numberOfLines={1}>Sleep</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>{todaySleep?.hours ?? 0}h</Text>
              <Text style={styles.summarySubtext} numberOfLines={1}>Last night</Text>
              {insights && (insights as any).calmnessScore !== undefined ? (
                <View style={styles.recommendationCardSmall}>
                  <View style={[styles.insightIconSmall, { backgroundColor: '#dbeafe' }]}>
                    <Ionicons name="trending-up" size={14} color="#2563eb" />
                  </View>
                  <Text style={styles.insightTextSmall}>
                    {(insights as any).recommendations?.[0]?.message ?? 'Loading insights...'}
                  </Text>
                </View>
              ) : null}
            </View>
          </GlowView>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconContainer, { backgroundColor: '#fef3c7' }]}>
              <Ionicons
                name={todayMood ? (moods.find(m => m.value === todayMood.mood)?.icon as any ?? 'happy-outline') : 'happy-outline'}
                size={24}
                color={todayMood ? (moods.find(m => m.value === todayMood.mood)?.color ?? '#eab308') : '#eab308'}
              />
            </View>
            <Text style={styles.summaryLabel} numberOfLines={1}>Mood</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>
              {todayMood ? (moods.find(m => m.value === todayMood.mood)?.label ?? 'Not set') : 'Not set'}
            </Text>
            <Text style={styles.summarySubtext} numberOfLines={1}>Today</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconContainer, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="locate" size={24} color="#16a34a" />
            </View>
            <Text style={styles.summaryLabel} numberOfLines={1}>Habits</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>{completedHabitsToday}/{totalHabits}</Text>
            <Text style={styles.summarySubtext} numberOfLines={1}>{completionPercentage}% done</Text>
          </View>
        </View>

        {/* Daily Habits */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Daily Habits</Text>
              <Text style={styles.habitsSubtitle}>{completedHabitsToday} of {totalHabits} completed</Text>
            </View>
            <TouchableOpacity style={styles.addHabitButton} onPress={() => setShowHabitModal(true)}>
              <Ionicons name="add" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarLabel}>
              <Text style={styles.progressBarText}>Today's Progress</Text>
              <Text style={styles.progressBarText}>{completionPercentage}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressBarFill, { width: `${completionPercentage}%` }]} />
            </View>
          </View>

          <View style={styles.habitsList}>
            {habitCategories.map(category => {
              const categoryHabits = (habits?.filter(h => toDisplayCategory(h.category) === category) ?? []).filter(
                (h) => showAllHabits || visibleHabitIds.has(h._id)
              );
              if (categoryHabits.length === 0) return null;

              return (
                <View key={category} style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>{categoryLabels[category].toUpperCase()}</Text>
                  {categoryHabits.map((habit) => (
                    <View key={habit._id} style={styles.habitItem}>
                      <View style={styles.habitLeft}>
                        <TouchableOpacity
                          style={[styles.habitCheckbox, habit.completedToday && styles.habitCheckboxCompleted]}
                          onPress={() => handleToggleHabit(habit._id)}
                        >
                          {habit.completedToday && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                          <SparkleEffect visible={sparkleTrigger === habit._id} />
                        </TouchableOpacity>
                        <View style={[styles.habitIconContainer, { backgroundColor: '#dbeafe' }]}>
                          <Ionicons name={getIconName(habit.icon) as any} size={16} color="#2563eb" />
                        </View>
                        <View style={styles.habitInfo}>
                          <Text style={styles.habitName}>{habit.name}</Text>
                          <Text style={styles.habitStreak}>{habit.streak} day streak</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteHabit(habit._id)}>
                        <Ionicons name="trash" size={16} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>

          {totalHabits > 5 && (
            <TouchableOpacity
              onPress={() => setShowAllHabits((v) => !v)}
              style={{ marginTop: 14, alignSelf: 'center' }}
              activeOpacity={0.75}
            >
              <Text style={{ color: '#2563eb', fontWeight: '700' }}>
                {showAllHabits ? 'View less' : 'View more'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* AIMind Hub */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🧠 AIMind Hub</Text>
            <Ionicons name="fitness-outline" size={24} color="#6366f1" />
          </View>

          <View style={styles.aimindGrid}>
            <TouchableOpacity
              style={[styles.aimindCard, { backgroundColor: '#6366f1' }]}
              onPress={() => {
                triggerSound(SoundEffect.ENTER_MEDITATION_HUB);
                setShowMeditationHub(true);
              }}
            >
              <Ionicons name="leaf" size={24} color="#ffffff" />
              <Text style={styles.aimindCardText}>Meditate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.aimindCard, { backgroundColor: '#f43f5e' }]} onPress={() => setShowGratitudeModal(true)}>
              <Ionicons name="heart" size={24} color="#ffffff" />
              <Text style={styles.aimindCardText}>Gratitude</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.aimindCard, { backgroundColor: '#f59e0b' }]} onPress={() => setShowJournalModal(true)}>
              <Ionicons name="create" size={24} color="#ffffff" />
              <Text style={styles.aimindCardText}>Journal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.aimindCard, { backgroundColor: '#14b8a6' }]} onPress={() => setShowInsightsModal(true)}>
              <Ionicons name="stats-chart" size={24} color="#ffffff" />
              <Text style={styles.aimindCardText}>Insights</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.aimindCard, { backgroundColor: '#4CAF50' }]} onPress={() => setShowMindWorld(true)}>
              <Ionicons name="planet" size={24} color="#ffffff" />
              <Text style={styles.aimindCardText}>MindWorld</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.aimindCard, { backgroundColor: '#a855f7' }]}
              onPress={() => {
                triggerSound(SoundEffect.ENTER_GAMES_HUB);
                setShowGamesHub(true);
              }}
            >
              <Ionicons name="game-controller" size={24} color="#ffffff" />
              <Text style={styles.aimindCardText}>Games</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mindfulness Session */}
        <View style={styles.mindfulnessCard}>
          <View style={styles.mindfulnessContent}>
            <View style={styles.mindfulnessTextContainer}>
              <Text style={styles.mindfulnessTitle}>aiMind Session</Text>
              <Text style={styles.mindfulnessSubtitle}>
                Guided meditation for better sleep
              </Text>
              <Text style={styles.mindfulnessTonight}>Tonight's Session</Text>
              <Text style={styles.mindfulnessSessionName}>Deep Sleep Journey</Text>
            </View>
            <TouchableOpacity
              style={styles.mindfulnessButton}
              onPress={() => {
                triggerSound(SoundEffect.ENTER_MEDITATION_HUB);
                setShowMeditationHub(true);
              }}
            >
              <Text style={styles.mindfulnessButtonText}>Start 10 min</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Premium Insights */}
        {!user?.isPremium && (
          <TouchableOpacity
            style={styles.premiumCard}
            onPress={() => router.push('/premium')}
            activeOpacity={0.8}
          >
            <View style={styles.premiumContent}>
              <View style={styles.premiumIconContainer}>
                <Ionicons name="trending-up" size={32} color="#eab308" />
              </View>
              <Text style={styles.premiumTitle}>Unlock Wellness Insights</Text>
              <Text style={styles.premiumText}>
                Get personalized sleep recommendations, mood analysis, and wellness coaching
              </Text>
              <View style={styles.premiumButton}>
                <Text style={styles.premiumButtonText}>Upgrade to Premium</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Meditation Hub */}
      {showMeditationHub && user && (
        <MeditationHub
          userId={user._id}
          onClose={() => setShowMeditationHub(false)}
        />
      )}

      {/* Games Hub */}
      {showGamesHub && user && (
        <GamesHub
          userId={user._id}
          onClose={() => setShowGamesHub(false)}
        />
      )}

      {/* MindWorld Modal */}
      {showMindWorld && user && (
        <MindWorldScreen
          visible={true}
          onClose={() => setShowMindWorld(false)}
        />
      )}


      {/* Sleep Modal */}
      <Modal visible={showSleepModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSleepModal(false)}>
        <SafeAreaView style={styles.modalContent} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Sleep</Text>
            <TouchableOpacity onPress={() => setShowSleepModal(false)}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalScroll}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>How many hours did you sleep?</Text>
              <TextInput style={styles.input} placeholder="e.g., 7.5" value={sleepInput} onChangeText={setSleepInput} keyboardType="numeric" />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => setShowSleepModal(false)}>
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#8b5cf6' }]} onPress={handleAddSleep}>
                <Text style={styles.modalButtonText}>Log Sleep</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Mood Modal */}
      <Modal visible={showMoodModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowMoodModal(false)}>
        <SafeAreaView style={styles.modalContent} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>How are you feeling?</Text>
            <TouchableOpacity onPress={() => setShowMoodModal(false)}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalScroll}>
            <View style={styles.moodModalGrid}>
              {moods.map((mood) => (
                <TouchableOpacity key={mood.value} style={styles.moodModalButton} onPress={() => handleLogMood(mood.value)}>
                  <Ionicons name={mood.icon as any} size={40} color={mood.color} />
                  <Text style={styles.moodModalLabel}>{mood.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Habit Modal */}
      <Modal visible={showHabitModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowHabitModal(false)}>
        <SafeAreaView style={styles.modalContent} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Habit</Text>
            <TouchableOpacity onPress={() => setShowHabitModal(false)}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Habit Name</Text>
              <TextInput style={styles.input} placeholder="e.g., Drink water" value={newHabit.name} onChangeText={(text) => setNewHabit({ ...newHabit, name: text })} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {habitCategories.map(cat => (
                  <TouchableOpacity key={cat} style={[styles.categoryChip, newHabit.category === cat && styles.categoryChipActive]} onPress={() => setNewHabit({ ...newHabit, category: cat })}>
                    <Text style={[styles.categoryChipText, newHabit.category === cat && styles.categoryChipTextActive]}>{categoryLabels[cat]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Icon</Text>
              <View style={styles.iconGrid}>
                {iconOptions.map(opt => (
                  <TouchableOpacity key={opt.name} style={[styles.iconButton, newHabit.icon === opt.name && styles.iconButtonSelected]} onPress={() => setNewHabit({ ...newHabit, icon: opt.name })}>
                    <Ionicons name={opt.iconName as any} size={20} color={newHabit.icon === opt.name ? '#fff' : '#64748b'} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity style={styles.modalButton} onPress={handleAddCustomHabit}>
              <Text style={styles.modalButtonText}>Add Habit</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Gratitude Modal */}
      <Modal visible={showGratitudeModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowGratitudeModal(false)}>
        <SafeAreaView style={styles.modalContent} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>💗 Gratitude</Text>
            <TouchableOpacity onPress={() => setShowGratitudeModal(false)}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            <View style={styles.promptCard}>
              <Text style={styles.promptTitle}>Prompt</Text>
              <Text style={styles.promptText}>{gratitudePrompt}</Text>
              <View style={styles.promptRow}>
                <TouchableOpacity
                  style={styles.promptChip}
                  onPress={() => {
                    const prompts = [
                      'What made you smile today?',
                      'Who helped you recently?',
                      'What is one thing your body did for you today?',
                      'What’s something small you enjoyed today?',
                      'What progress are you proud of this week?',
                      'What’s a moment you want to remember?',
                    ];
                    const next = prompts[Math.floor(Math.random() * prompts.length)];
                    setGratitudePrompt(next);
                    triggerSound(SoundEffect.UI_TAP);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="shuffle" size={14} color="#64748b" />
                  <Text style={styles.promptChipText}>Surprise me</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.promptChip}
                  onPress={() => {
                    setGratitudeEntry((prev) => (prev ? `${prev}\n` : '') + `Because... `);
                    triggerSound(SoundEffect.UI_TAP);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="sparkles" size={14} color="#64748b" />
                  <Text style={styles.promptChipText}>Start for me</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Quick 3</Text>
            <Text style={styles.sectionHint}>Tiny wins count. Add up to 3 quick gratitude notes.</Text>
            {gratitudeLines.map((line, idx) => (
              <View key={idx} style={styles.quickLineRow}>
                <View style={styles.quickBullet}>
                  <Text style={styles.quickBulletText}>{idx + 1}</Text>
                </View>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder={`e.g., ${idx === 0 ? 'A good meal' : idx === 1 ? 'A kind text' : 'A calm moment'}`}
                  value={line}
                  onChangeText={(t) =>
                    setGratitudeLines((prev) => {
                      const next = [...prev];
                      next[idx] = t;
                      return next;
                    })
                  }
                />
              </View>
            ))}

            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Free write</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={gratitudePrompt}
              value={gratitudeEntry}
              onChangeText={setGratitudeEntry}
              multiline
            />

            <GlowView visible={gratitudeGlow} color="#f43f5e" style={{ marginTop: 12 }}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#f43f5e' }]} onPress={handleSaveGratitude}>
                <SparkleEffect visible={gratitudeSparkle}>
                  <Text style={styles.modalButtonText}>Save Gratitude</Text>
                </SparkleEffect>
              </TouchableOpacity>
            </GlowView>

            <View style={styles.recentEntriesSection}>
              <Text style={styles.recentEntriesTitle}>Recent Entries</Text>
              {gratitudeEntries?.map((e: Doc<"gratitudeEntries">) => (
                <View key={e._id} style={styles.entryCard}>
                  <Text style={styles.entryText}>{e.entry}</Text>
                  <Text style={styles.entryDate}>{e.date}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Journal Modal */}
      <Modal visible={showJournalModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowJournalModal(false)}>
        <SafeAreaView style={styles.modalContent} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>✍️ Journal</Text>
            <TouchableOpacity onPress={() => setShowJournalModal(false)}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            <TextInput style={[styles.input, styles.textArea]} placeholder="Write your thoughts..." value={journalContent} onChangeText={setJournalContent} multiline />
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#f59e0b', marginTop: 12 }]} onPress={handleSaveJournal}>
              <Text style={styles.modalButtonText}>Save</Text>
            </TouchableOpacity>
            <View style={styles.recentEntriesSection}>
              <Text style={styles.recentEntriesTitle}>Recent Entries</Text>
              {journalEntries?.map((e: Doc<"journalEntries">) => (
                <View key={e._id} style={styles.entryCard}>
                  <Text style={styles.entryText}>{e.content}</Text>
                  <Text style={styles.entryDate}>{e.date}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Insights Modal */}
      <Modal visible={showInsightsModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowInsightsModal(false)}>
        <SafeAreaView style={styles.modalContent} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📊 Insights</Text>
            <TouchableOpacity onPress={() => setShowInsightsModal(false)}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            <View style={{ gap: 12 }}>
              <Text style={[styles.recentEntriesTitle, { marginBottom: 4 }]}>Your Analytics</Text>

              {(
                [
                  {
                    key: 'habits_today',
                    title: "Today's Habit Progress",
                    value: `${completionPercentage}%`,
                    subtitle: `${completedHabitsToday}/${totalHabits} completed`,
                    color: '#16a34a',
                    locked: false,
                  },
                  {
                    key: 'sleep_avg',
                    title: '7-day Avg Sleep',
                    value: `${sleepAvg}h`,
                    subtitle: `${goodNights}/7 good nights (≥7h)`,
                    color: '#8b5cf6',
                    locked: false,
                  },
                  {
                    key: 'sleep_quality',
                    title: '7-day Sleep Quality',
                    value: `${sleepQualityAvg}%`,
                    subtitle: `Tap to see daily breakdown`,
                    color: '#7c3aed',
                    locked: !isPremiumActive,
                  },
                  {
                    key: 'sleep_consistency',
                    title: 'Sleep Consistency',
                    value: `±${sleepConsistency}h`,
                    subtitle: `Lower is better (7-day variation)`,
                    color: '#6366f1',
                    locked: !isPremiumActive,
                  },
                  {
                    key: 'mood_avg',
                    title: 'Weekly Mood Average',
                    value: `${moodAvg}/5`,
                    subtitle: `Tap to see trend`,
                    color: '#ec4899',
                    locked: !isPremiumActive,
                  },
                  {
                    key: 'mood_trend',
                    title: 'Weekly Mood Trend',
                    value: `7 days`,
                    subtitle: `Tap to view`,
                    color: '#f43f5e',
                    locked: !isPremiumActive,
                  },
                  {
                    key: 'mood_stability',
                    title: 'Mood Stability',
                    value: `${moodStability}%`,
                    subtitle: `Based on 7-day mood variance`,
                    color: '#fb7185',
                    locked: !isPremiumActive,
                  },
                  {
                    key: 'meditation_7d',
                    title: 'Meditation Minutes',
                    value: `${meditationMinutes7d}m`,
                    subtitle: `Last 7 days`,
                    color: '#14b8a6',
                    locked: !isPremiumActive,
                  },
                  {
                    key: 'reflection_7d',
                    title: 'Reflection Entries',
                    value: `${gratitudeCount7d + journalCount7d}`,
                    subtitle: `Gratitude + Journal (7 days)`,
                    color: '#f59e0b',
                    locked: !isPremiumActive,
                  },
                  {
                    key: 'top_streaks',
                    title: 'Top Habit Streaks',
                    value: `${topHabitsByStreak[0]?.streak ?? 0}d`,
                    subtitle: topHabitsByStreak.length > 0 ? `Tap to see your top 3` : `No habits yet`,
                    color: '#22c55e',
                    locked: !isPremiumActive,
                  },
                ] as Array<{
                  key: string;
                  title: string;
                  value: string;
                  subtitle: string;
                  color: string;
                  locked: boolean;
                }>
              ).map((m) => (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => openMetric(m.key, m.title, m.locked)}
                  activeOpacity={0.85}
                  style={[styles.metricCard, m.locked && styles.metricCardLocked]}
                >
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.metricTitle}>{m.title}</Text>
                    <Text style={styles.metricSubtitle} numberOfLines={2}>
                      {m.locked ? 'Premium: tap to upgrade' : m.subtitle}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                    {m.locked ? (
                      <Ionicons name="lock-closed" size={18} color="#94a3b8" />
                    ) : (
                      <>
                        <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
                        <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              <Text style={[styles.recentEntriesTitle, { marginTop: 8 }]}>AI Recommendations</Text>
              {insights && (insights as any).calmnessScore !== undefined ? (
                <View style={styles.recommendationCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.recommendationMessage, { color: '#1e293b' }]}>Calmness Score</Text>
                    <Text style={{ color: '#14b8a6', fontSize: 16, fontWeight: '900' }}>{(insights as any).calmnessScore}%</Text>
                  </View>
                  <Text style={[styles.recommendationAction, { color: '#64748b' }]}>Generated from your recent activity</Text>
                </View>
              ) : (
                <Text style={styles.noEntriesText}>Track more to unlock better recommendations.</Text>
              )}
              {insights && (insights as any).recommendations ? (
                ((insights as any).recommendations as any[]).map(
                  (r: { message: string; action: string }, i: number) => (
                    <View key={i} style={styles.recommendationCard}>
                      <Text style={styles.recommendationMessage}>{r.message}</Text>
                      <Text style={styles.recommendationAction}>{r.action}</Text>
                    </View>
                  )
                )
              ) : null}

              {/* MindWorld/AI Hub Item Trigger Fix */}
              <TouchableOpacity
                style={[styles.metricCard, { marginTop: 16 }]}
                onPress={() => {
                  if (user?._id) setShowMindWorld(true);
                }}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.metricTitle}>MindWorld AI Explorer</Text>
                  <Text style={styles.metricSubtitle}>Interactive mental resilience world</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Insight Detail Modal */}
      <Modal
        visible={!!insightDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setInsightDetail(null)}
      >
        <SafeAreaView style={styles.modalContent} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{insightDetail?.title ?? 'Insight'}</Text>
            <TouchableOpacity onPress={() => setInsightDetail(null)}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            {insightDetail?.key === 'mood_trend' || insightDetail?.key === 'mood_avg' ? (
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Last 7 Days</Text>
                <View style={styles.detailRow}>
                  {moodTrend.map((v, idx) => (
                    <View key={`${idx}`} style={styles.detailDay}>
                      <Text style={styles.detailEmoji}>
                        {v === 0
                          ? '—'
                          : v === 5
                            ? '😄'
                            : v === 4
                              ? '🙂'
                              : v === 3
                                ? '😐'
                                : v === 2
                                  ? '😟'
                                  : '😢'}
                      </Text>
                      <Text style={styles.detailDayLabel}>{weekDayLabels[idx]}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.detailFootnote}>Tap “Log Mood” in the + menu to fill in missing days.</Text>
              </View>
            ) : null}

            {insightDetail?.key === 'sleep_quality' || insightDetail?.key === 'sleep_avg' || insightDetail?.key === 'sleep_consistency' ? (
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Sleep (7 Days)</Text>
                {last7Dates.map((d, idx) => (
                  <View key={d} style={styles.detailLine}>
                    <Text style={styles.detailLineLeft}>{weekDayLabels[idx]}</Text>
                    <Text style={styles.detailLineMid}>{sleepHoursTrend[idx] ? `${sleepHoursTrend[idx]}h` : '—'}</Text>
                    <Text style={styles.detailLineRight}>{sleepQualityTrend[idx] ? `${sleepQualityTrend[idx]}%` : ''}</Text>
                  </View>
                ))}
                <Text style={styles.detailFootnote}>Hours and quality come from your Sleep logs.</Text>
              </View>
            ) : null}

            {insightDetail?.key === 'top_streaks' ? (
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Top 3 Habit Streaks</Text>
                {topHabitsByStreak.length === 0 ? (
                  <Text style={styles.noEntriesText}>No habits yet.</Text>
                ) : (
                  topHabitsByStreak.map((h: any) => (
                    <View key={h._id} style={styles.detailLine}>
                      <Text style={styles.detailLineLeft}>{h.name}</Text>
                      <Text style={styles.detailLineRight}>{h.streak ?? 0}d</Text>
                    </View>
                  ))
                )}
              </View>
            ) : null}

            {insightDetail?.key === 'habits_today' ? (
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Today’s Habits</Text>
                <Text style={styles.detailFootnote}>
                  {completedHabitsToday}/{totalHabits} completed ({completionPercentage}%)
                </Text>
              </View>
            ) : null}

            {insightDetail?.key === 'meditation_7d' ? (
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Meditation Minutes</Text>
                <Text style={styles.detailFootnote}>{meditationMinutes7d} minutes in the last 7 days.</Text>
              </View>
            ) : null}

            {insightDetail?.key === 'reflection_7d' ? (
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Reflection</Text>
                <Text style={styles.detailFootnote}>
                  Gratitude entries: {gratitudeCount7d} {'\n'}
                  Journal entries: {journalCount7d}
                </Text>
              </View>
            ) : null}

            {insightDetail?.key === 'mood_stability' ? (
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Mood Stability</Text>
                <Text style={styles.detailFootnote}>
                  {moodStability}% (higher = steadier). Based on how much your 7‑day mood scores vary.
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* STOPPR/Sugarcut-style SOS panic button (Pro/Admin only) */}
      {user?._id ? <PanicButton userId={user._id} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ebf2fe',
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
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  plusButton: {},
  plusMenu: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  plusMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  plusMenuText: {
    fontSize: 14,
    color: '#1e293b',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  summaryCardWrapper: {
    flex: 1,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: isSmallScreen ? 12 : 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  summarySubtext: {
    fontSize: 10,
    color: '#94a3b8',
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 20,
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
  habitsSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  addHabitButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarContainer: {
    marginBottom: 20,
  },
  progressBarLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressBarText: {
    fontSize: 12,
    color: '#64748b',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#16a34a',
  },
  habitsList: {
    gap: 16,
  },
  categorySection: {
    gap: 8,
  },
  categoryTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
  },
  habitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  habitCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitCheckboxCompleted: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  habitIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  habitStreak: {
    fontSize: 11,
    color: '#64748b',
  },
  aimindGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  aimindCard: {
    width: (width - 48 - 64) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  aimindCardText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalScroll: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  moodModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moodModalButton: {
    width: (width - 52) / 2,
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  moodModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  categoryChipActive: {
    backgroundColor: '#16a34a',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#64748b',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonSelected: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  recentEntriesSection: {
    marginTop: 24,
    gap: 12,
  },
  recentEntriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  entryCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  entryText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  entryDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
  },
  promptCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginBottom: 12,
  },
  promptTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#9a3412',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  promptText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    lineHeight: 22,
  },
  promptRow: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  promptChip: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  promptChipText: { color: '#475569', fontWeight: '800', fontSize: 12 },
  sectionLabel: { fontSize: 14, fontWeight: '900', color: '#1e293b', marginBottom: 6 },
  sectionHint: { fontSize: 12, color: '#64748b', marginBottom: 10, lineHeight: 16 },
  quickLineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  quickBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickBulletText: { color: '#be123c', fontWeight: '900' },
  noEntriesText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 20,
  },
  insightCardLarge: {
    backgroundColor: '#14b8a6',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  insightValueLarge: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  insightLabelLarge: {
    color: '#ffffff',
    opacity: 0.8,
  },
  recommendationCard: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  recommendationMessage: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  recommendationAction: {
    fontSize: 12,
    color: '#14b8a6',
    marginTop: 4,
  },
  recommendationCardSmall: {
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightIconSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightTextSmall: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
  },

  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricCardLocked: {
    opacity: 0.75,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailDay: { alignItems: 'center', flex: 1 },
  detailEmoji: { fontSize: 20 },
  detailDayLabel: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  detailLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailLineLeft: { flex: 1, color: '#1e293b', fontWeight: '700' },
  detailLineMid: { width: 70, textAlign: 'center', color: '#334155', fontWeight: '700' },
  detailLineRight: { width: 60, textAlign: 'right', color: '#64748b', fontWeight: '700' },
  detailFootnote: { marginTop: 10, color: '#64748b', fontSize: 12, lineHeight: 18 },
  mindfulnessCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mindfulnessContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  mindfulnessTextContainer: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  mindfulnessTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  mindfulnessSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 12,
    lineHeight: 20,
  },
  mindfulnessTonight: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
    marginBottom: 4,
  },
  mindfulnessSessionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    minHeight: 20,
  },
  mindfulnessButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    flexShrink: 0,
  },
  mindfulnessButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    minHeight: 16,
  },
  premiumCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#fef3c7',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  premiumContent: {
    alignItems: 'center',
  },
  premiumIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  premiumText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  premiumButton: {
    backgroundColor: '#eab308',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  premiumButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
