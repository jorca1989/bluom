import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUser as useClerkUser } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getBottomContentPadding } from '@/utils/layout';
import { SoundEffect, triggerSound } from '@/utils/soundEffects';
import { useCelebration } from '@/context/CelebrationContext';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;

const safeNumber = (val: string | number, fallback = 0) => {
  const parsed = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(parsed) ? fallback : parsed;
};

type ExerciseType = 'strength' | 'cardio' | 'hiit' | 'yoga';
type ExerciseLibraryItem = {
  _id: any;
  name: string;
  category: string;
  type: ExerciseType;
  met: number;
  caloriesPerMinute?: number;
  muscleGroups: string[];
};


const workoutCategories = ['All', 'Strength', 'Cardio', 'HIIT', 'Flexibility'] as const;

function toIsoDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function MoveScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ openWorkouts?: string }>();
  const insets = useSafeAreaInsets();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useClerkUser();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const logExerciseEntry = useMutation(api.exercise.logExerciseEntry);
  const addStepsEntry = useMutation(api.steps.addStepsEntry);
  const deleteExerciseEntry = useMutation(api.exercise.deleteExerciseEntry);
  const deleteStepsEntry = useMutation(api.steps.deleteStepsEntry);
  const celebration = useCelebration();

  const today = useMemo(() => new Date(), []);
  const currentDate = useMemo(() => toIsoDateString(today), [today]);

  const exerciseEntries = useQuery(
    api.exercise.getExerciseEntriesByDate,
    convexUser?._id ? { userId: convexUser._id, date: currentDate } : 'skip'
  );

  const stepsEntries = useQuery(
    api.steps.getStepsEntriesByDate,
    convexUser?._id ? { userId: convexUser._id, date: currentDate } : 'skip'
  );

  const weekStart = useMemo(() => toIsoDateString(addDays(today, -6)), [today]);
  const weekEnd = currentDate;
  const weekExerciseEntries = useQuery(
    api.exercise.getExerciseEntriesInRange,
    convexUser?._id ? { userId: convexUser._id, startDate: weekStart, endDate: weekEnd } : 'skip'
  );

  const loading =
    !isClerkLoaded ||
    (clerkUser && convexUser === undefined) ||
    exerciseEntries === undefined ||
    stepsEntries === undefined;

  // UI state
  const [showDropdown, setShowDropdown] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [showStepsModal, setShowStepsModal] = useState(false);
  const [showCustomExercise, setShowCustomExercise] = useState(false);

  // Search state (debounced)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof workoutCategories)[number]>('All');
  const [searchResults, setSearchResults] = useState<ExerciseLibraryItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseLibraryItem | null>(null);

  // Convex Exercise Library Query
  const exerciseLibrary = useQuery(api.exercises.list, {
    search: searchQuery || undefined,
    category: selectedCategory === 'All' ? undefined : selectedCategory
  });

  useEffect(() => {
    if (exerciseLibrary) {
      setSearchResults(exerciseLibrary);
    }
  }, [exerciseLibrary]);

  useEffect(() => {
    setSearchLoading(exerciseLibrary === undefined);
  }, [exerciseLibrary]);

  // Forms
  const [workoutForm, setWorkoutForm] = useState({
    duration: '30',
    sets: '3',
    reps: '10',
    weight: '50',
    calories: '',
  });
  const [customExerciseForm, setCustomExerciseForm] = useState({
    name: '',
    description: '',
    duration: '',
    calories: '',
  });
  const [stepsInput, setStepsInput] = useState('');

  // Open search modal via route param (only once)
  const openedFromParam = useRef(false);
  useEffect(() => {
    if (openedFromParam.current) return;
    if (params?.openWorkouts) {
      openedFromParam.current = true;
      setShowExerciseSearch(true);
    }
  }, [params?.openWorkouts]);


  const todayTotals = useMemo(() => {
    const ex = exerciseEntries ?? [];
    const total = ex.reduce(
      (acc: { workouts: number; minutes: number; calories: number }, entry: any) => {
        acc.workouts += 1;
        acc.minutes += entry.duration;
        acc.calories += entry.caloriesBurned;
        return acc;
      },
      { workouts: 0, minutes: 0, calories: 0 }
    );
    const steps = (stepsEntries ?? []).reduce((acc: number, e: any) => acc + e.steps, 0);
    const stepsCalories = (stepsEntries ?? []).reduce((acc: number, e: any) => acc + e.caloriesBurned, 0);
    return {
      workouts: total.workouts,
      minutes: Math.round(total.minutes),
      calories: Math.round(total.calories + stepsCalories),
      steps: Math.round(steps),
    };
  }, [exerciseEntries, stepsEntries]);

  const todayActivities = useMemo(() => {
    const ex = (exerciseEntries ?? []).map((entry) => ({
      id: entry._id,
      name: entry.exerciseName,
      duration: entry.duration,
      calories: entry.caloriesBurned,
      timestamp: entry.timestamp,
      activityType: 'exercise' as const,
      entry,
    }));

    const st = (stepsEntries ?? []).map((entry) => ({
      id: entry._id,
      name: `${Math.round(entry.steps).toLocaleString()} Steps`,
      duration: 0,
      calories: entry.caloriesBurned,
      timestamp: entry.timestamp,
      activityType: 'steps' as const,
      entry,
    }));

    return [...ex, ...st].sort((a, b) => b.timestamp - a.timestamp);
  }, [exerciseEntries, stepsEntries]);

  const weekDays = useMemo(() => {
    const now = today;
    const days = [];
    for (let i = 6; i >= 0; i--) {
      days.push(addDays(now, -i));
    }
    return days;
  }, [today]);

  const weekData = useMemo(() => {
    const entries = weekExerciseEntries ?? [];
    const counts = new Map<string, number>();
    for (const e of entries) {
      counts.set(e.date, (counts.get(e.date) ?? 0) + 1);
    }
    return weekDays.map((d) => counts.get(toIsoDateString(d)) ?? 0);
  }, [weekDays, weekExerciseEntries]);

  const weekDayLabels = useMemo(() => ['M', 'T', 'W', 'T', 'F', 'S', 'S'], []);

  const closeAllOverlays = () => setShowDropdown(false);

  const calculateCalories = (
    exercise: ExerciseLibraryItem,
    durationMinutes: number,
    sets?: number,
    reps?: number,
    weight?: number
  ) => {
    let base = (exercise.caloriesPerMinute || 6) * durationMinutes;
    if (exercise.type === 'strength' && sets && reps && weight) {
      const intensityMultiplier = Math.min(weight / 50, 2);
      base *= intensityMultiplier;
    }
    return Math.round(base);
  };

  const handleExerciseSelect = (exercise: ExerciseLibraryItem) => {
    setSelectedExercise(exercise);
    setWorkoutForm({
      duration: '30',
      sets: exercise.type === 'strength' ? '3' : '',
      reps: exercise.type === 'strength' ? '10' : '',
      weight: exercise.type === 'strength' ? '50' : '',
      calories: '',
    });
  };

  const computeMetFromCaloriesPerMinute = (cpm: number | undefined) => {
    if (!cpm) return 6;
    const MET_FACTOR = 1 / (Math.max(1, convexUser?.weight ?? 70) / 60);
    return Math.max(0.1, cpm * MET_FACTOR);
  };

  const logExercise = async () => {
    if (!convexUser?._id) return;
    if (!selectedExercise) return;
    const duration = Math.max(1, Math.floor(safeNumber(workoutForm.duration, 0)));
    if (!duration) return;

    const sets = workoutForm.sets ? Math.max(0, Math.floor(safeNumber(workoutForm.sets, 0))) : undefined;
    const reps = workoutForm.reps ? Math.max(0, Math.floor(safeNumber(workoutForm.reps, 0))) : undefined;
    const weight = workoutForm.weight ? Math.max(0, safeNumber(workoutForm.weight, 0)) : undefined;

    const caloriesBurned = workoutForm.calories
      ? Math.max(0, Math.floor(safeNumber(workoutForm.calories, 0)))
      : calculateCalories(selectedExercise, duration, sets, reps, weight);

    // Derive MET so server-side formula produces our target calories as closely as possible.
    const durationHours = duration / 60;
    const metFromCalories = caloriesBurned / (Math.max(1, convexUser.weight) * Math.max(0.01, durationHours));
    const met = Number.isFinite(metFromCalories)
      ? Math.max(0.1, metFromCalories)
      : computeMetFromCaloriesPerMinute(selectedExercise.caloriesPerMinute);

    try {
      await logExerciseEntry({
        userId: convexUser._id,
        exerciseName: selectedExercise.name,
        exerciseType: selectedExercise.type,
        duration,
        met,
        sets: sets ? sets : undefined,
        reps: reps ? reps : undefined,
        weight: weight ? weight : undefined,
        date: currentDate,
      });

      triggerSound(SoundEffect.LOG_WORKOUT);
      celebration.trigger('fireworks');
      setSelectedExercise(null);
      setShowExerciseSearch(false);
      setShowCustomExercise(false);
      setShowWorkoutModal(false);
      Alert.alert('Success', `${selectedExercise.name} logged successfully!`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to log workout');
    }
  };

  const logCustomExercise = async () => {
    if (!convexUser?._id) return;
    const name = customExerciseForm.name.trim();
    const duration = Math.max(1, Math.floor(safeNumber(customExerciseForm.duration, 0)));
    const caloriesBurned = Math.max(0, Math.floor(safeNumber(customExerciseForm.calories, 0)));

    if (!name || !duration || !caloriesBurned) return;

    const durationHours = duration / 60;
    const met = caloriesBurned / (Math.max(1, convexUser.weight) * Math.max(0.01, durationHours));

    try {
      await logExerciseEntry({
        userId: convexUser._id,
        exerciseName: name,
        exerciseType: 'cardio',
        duration,
        met: Number.isFinite(met) ? Math.max(0.1, met) : 6,
        date: currentDate,
      });

      triggerSound(SoundEffect.LOG_WORKOUT);
      celebration.trigger('fireworks');
      setCustomExerciseForm({ name: '', description: '', duration: '', calories: '' });
      setShowCustomExercise(false);
      setShowWorkoutModal(false);
      Alert.alert('Success', `${name} logged successfully!`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to log exercise');
    }
  };

  const addSteps = async () => {
    if (!convexUser?._id) return;
    const steps = Math.max(0, Math.floor(safeNumber(stepsInput, 0)));
    if (!steps) return;

    try {
      await addStepsEntry({
        userId: convexUser._id,
        date: currentDate,
        steps,
      });
      triggerSound(SoundEffect.LOG_STEPS);
      celebration.trigger('confetti');
      setStepsInput('');
      setShowStepsModal(false);
      Alert.alert('Success', `${steps.toLocaleString()} steps added!`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to add steps');
    }
  };

  const handleDeleteActivity = async (activity: (typeof todayActivities)[number]) => {
    if (activity.activityType === 'exercise') {
      try {
        await deleteExerciseEntry({ entryId: activity.entry._id });
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'Failed to delete workout');
      }
      return;
    }
    try {
      await deleteStepsEntry({ entryId: activity.entry._id });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to delete steps entry');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 24) + 12, // Larger bottom padding for Move tab due to many cards
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 12 }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Move</Text>
              <Text style={styles.subtitle}>Track your workouts & activity</Text>
            </View>
            <TouchableOpacity
              style={[styles.headerButton, styles.plusButton]}
              onPress={() => setShowDropdown((v) => !v)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Plus Menu */}
        {showDropdown && (
          <View style={styles.plusMenu}>
            <TouchableOpacity
              style={styles.plusMenuItem}
              onPress={() => {
                closeAllOverlays();
                setShowWorkoutModal(true);
                setShowCustomExercise(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="barbell" size={20} color="#1e293b" />
              <Text style={styles.plusMenuText}>Log Workout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.plusMenuItem}
              onPress={() => {
                closeAllOverlays();
                setShowStepsModal(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="locate" size={20} color="#1e293b" />
              <Text style={styles.plusMenuText}>Add Steps</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.plusMenuItem}
              onPress={() => {
                closeAllOverlays();
                setShowWorkoutModal(true);
                setShowCustomExercise(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={20} color="#1e293b" />
              <Text style={styles.plusMenuText}>Custom Exercise</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Activity Summary */}
        <View style={styles.activitySummary}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconContainer, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="barbell" size={24} color="#2563eb" />
            </View>
            <Text style={styles.summaryLabel} numberOfLines={1} adjustsFontSizeToFit>
              Workouts
            </Text>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
              {todayTotals.workouts}
            </Text>
            <Text style={styles.summarySubtext} numberOfLines={1} adjustsFontSizeToFit>
              Today
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconContainer, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="time" size={24} color="#2563eb" />
            </View>
            <Text style={styles.summaryLabel} numberOfLines={1} adjustsFontSizeToFit>
              Minutes
            </Text>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
              {todayTotals.minutes}
            </Text>
            <Text style={styles.summarySubtext} numberOfLines={1} adjustsFontSizeToFit>
              Exercise time
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconContainer, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="flash" size={24} color="#2563eb" />
            </View>
            <Text style={styles.summaryLabel} numberOfLines={1} adjustsFontSizeToFit>
              Calories
            </Text>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
              {todayTotals.calories}
            </Text>
            <Text style={styles.summarySubtext} numberOfLines={1} adjustsFontSizeToFit>
              Burned today
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconContainer, { backgroundColor: '#ede9fe' }]}>
              <Ionicons name="locate" size={24} color="#8b5cf6" />
            </View>
            <Text style={styles.summaryLabel} numberOfLines={1} adjustsFontSizeToFit>
              Steps
            </Text>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
              {todayTotals.steps.toLocaleString()}
            </Text>
            <TouchableOpacity onPress={() => setShowStepsModal(true)} activeOpacity={0.7}>
              <Text style={styles.addStepsLink}>Add steps</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Weekly Progress */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Weekly Progress</Text>
            <Ionicons name="trending-up" size={24} color="#2563eb" />
          </View>

          <View style={styles.chartContainer}>
            {weekData.map((workouts, idx) => (
              <View key={`${idx}`} style={styles.chartBarWrapper}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      height: Math.max(6, workouts * 15),
                      opacity: workouts === 0 ? 0.25 : 1,
                    },
                  ]}
                />
                <Text style={styles.chartDay}>{weekDayLabels[idx]}</Text>
              </View>
            ))}
          </View>

          <View style={styles.weeklyStatsGrid}>
            <View style={styles.weeklyStatItem}>
              <Text style={styles.weeklyStatValue}>{weekData.reduce((a, b) => a + b, 0)}</Text>
              <Text style={styles.weeklyStatLabel}>Workouts</Text>
            </View>
            <View style={styles.weeklyStatItem}>
              <Text style={styles.weeklyStatValue}>
                {Math.round(
                  (weekExerciseEntries ?? []).reduce(
                    (acc: number, e: any) => acc + e.duration,
                    0
                  ) / 60
                )}
                h
              </Text>
              <Text style={styles.weeklyStatLabel}>Total time</Text>
            </View>
            <View style={styles.weeklyStatItem}>
              <Text style={styles.weeklyStatValue}>
                {Math.round(
                  (weekExerciseEntries ?? []).reduce(
                    (acc: number, e: any) => acc + e.caloriesBurned,
                    0
                  )
                )}
              </Text>
              <Text style={styles.weeklyStatLabel}>Calories</Text>
            </View>
          </View>
        </View>

        {/* Today's Activities */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Today's Activities</Text>
            <Ionicons name="pulse" size={24} color="#2563eb" />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Loading activity...</Text>
            </View>
          ) : todayActivities.length > 0 ? (
            <View style={styles.activitiesList}>
              {todayActivities.map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <View style={styles.activityLeft}>
                    <View style={[styles.activityIconContainer, { backgroundColor: '#dbeafe' }]}>
                      {activity.activityType === 'steps' ? (
                        <Ionicons name="locate" size={16} color="#2563eb" />
                      ) : (
                        <Ionicons name="barbell" size={16} color="#2563eb" />
                      )}
                    </View>

                    <View style={styles.activityInfo}>
                      <Text style={styles.activityName}>{activity.name}</Text>
                      <Text style={styles.activityDetails}>
                        {activity.activityType === 'exercise' && activity.duration > 0
                          ? `${Math.round(activity.duration)} min • `
                          : ''}
                        {Math.round(activity.calories)} cal
                        {activity.activityType === 'exercise' && activity.entry.sets && activity.entry.reps
                          ? ` • ${Math.round(activity.entry.sets)}x${Math.round(activity.entry.reps)}`
                          : ''}
                        {activity.activityType === 'exercise' && activity.entry.weight
                          ? ` • ${Math.round(activity.entry.weight)}kg`
                          : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.activityRight}>
                    <Text style={styles.activityTime}>
                      {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert('Delete?', 'Remove this entry?', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => handleDeleteActivity(activity),
                          },
                        ]);
                      }}
                      activeOpacity={0.7}
                      style={styles.deleteButtonNaked}
                    >
                      <Ionicons name="trash" size={18} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="barbell" size={32} color="#94a3b8" />
              </View>
              <Text style={styles.emptyStateText}>No activities logged today</Text>
              <Text style={styles.emptyStateSubtext}>Tap + to log a workout or add steps.</Text>
            </View>
          )}
        </View>

        {/* Achievements (UI only for now) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Achievements</Text>
            <Ionicons name="trophy" size={24} color="#f59e0b" />
          </View>
          <View style={styles.achievementsList}>
            <View style={[styles.achievementItem, { backgroundColor: '#fef3c7' }]}>
              <View style={[styles.achievementIcon, { backgroundColor: '#f59e0b' }]}>
                <Ionicons name="star" size={16} color="#ffffff" />
              </View>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementTitle}>First Workout</Text>
                <Text style={styles.achievementDescription}>Log your first workout to unlock this badge.</Text>
              </View>
            </View>

            <View style={[styles.achievementItem, { backgroundColor: '#dbeafe' }]}>
              <View style={[styles.achievementIcon, { backgroundColor: '#2563eb' }]}>
                <Ionicons name="locate" size={16} color="#ffffff" />
              </View>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementTitle}>Step Goal</Text>
                <Text style={styles.achievementDescription}>Add steps to start tracking daily totals.</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Workout Modal */}
      <Modal
        visible={showWorkoutModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWorkoutModal(false)}
      >
        <SafeAreaView style={styles.modalContent} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{showCustomExercise ? 'Create Custom Exercise' : 'Log Workout'}</Text>
            <TouchableOpacity
              onPress={() => {
                setShowWorkoutModal(false);
                setShowCustomExercise(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom) }}
            keyboardShouldPersistTaps="handled"
          >
            {showCustomExercise ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Exercise name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Exercise name"
                    value={customExerciseForm.name}
                    onChangeText={(text) => setCustomExerciseForm({ ...customExerciseForm, name: text })}
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description (optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Description (optional)"
                    value={customExerciseForm.description}
                    onChangeText={(text) =>
                      setCustomExerciseForm({ ...customExerciseForm, description: text })
                    }
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Duration (minutes)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Duration (minutes)"
                    value={customExerciseForm.duration}
                    onChangeText={(text) => setCustomExerciseForm({ ...customExerciseForm, duration: text })}
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Calories burned</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Calories burned"
                    value={customExerciseForm.calories}
                    onChangeText={(text) => setCustomExerciseForm({ ...customExerciseForm, calories: text })}
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalButtonSecondary}
                    onPress={() => {
                      setShowCustomExercise(false);
                      setShowWorkoutModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      (!customExerciseForm.name || !customExerciseForm.duration || !customExerciseForm.calories) &&
                      styles.modalButtonDisabled,
                    ]}
                    onPress={logCustomExercise}
                    disabled={!customExerciseForm.name || !customExerciseForm.duration || !customExerciseForm.calories}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalButtonText}>Log Exercise</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.searchExerciseButton}
                  onPress={() => setShowExerciseSearch(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="search" size={20} color="#64748b" />
                  <Text style={styles.searchExerciseButtonText}>Search Exercise Database</Text>
                </TouchableOpacity>

                {selectedExercise ? (
                  <View style={styles.selectedExerciseCard}>
                    <Text style={styles.selectedExerciseName}>{selectedExercise.name}</Text>
                    <Text style={styles.selectedExerciseCategory}>
                      {selectedExercise.category} • {selectedExercise.type}
                    </Text>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Duration (minutes)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Duration (minutes)"
                        value={workoutForm.duration}
                        onChangeText={(text) => setWorkoutForm({ ...workoutForm, duration: text })}
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                      />
                    </View>

                    {selectedExercise.type === 'strength' ? (
                      <>
                        <View style={styles.inputRow}>
                          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.inputLabel}>Sets</Text>
                            <TextInput
                              style={styles.input}
                              placeholder="Sets"
                              value={workoutForm.sets}
                              onChangeText={(text) => setWorkoutForm({ ...workoutForm, sets: text })}
                              placeholderTextColor="#94a3b8"
                              keyboardType="numeric"
                            />
                          </View>
                          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.inputLabel}>Reps</Text>
                            <TextInput
                              style={styles.input}
                              placeholder="Reps"
                              value={workoutForm.reps}
                              onChangeText={(text) => setWorkoutForm({ ...workoutForm, reps: text })}
                              placeholderTextColor="#94a3b8"
                              keyboardType="numeric"
                            />
                          </View>
                        </View>

                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Weight (kg)</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="Weight (kg)"
                            value={workoutForm.weight}
                            onChangeText={(text) => setWorkoutForm({ ...workoutForm, weight: text })}
                            placeholderTextColor="#94a3b8"
                            keyboardType="numeric"
                          />
                        </View>
                      </>
                    ) : null}

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Calories burned (optional)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Calories burned (optional)"
                        value={workoutForm.calories}
                        onChangeText={(text) => setWorkoutForm({ ...workoutForm, calories: text })}
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                      />
                    </View>

                    {workoutForm.duration ? (
                      <Text style={styles.estimatedCalories}>
                        Estimated calories:{' '}
                        {calculateCalories(
                          selectedExercise,
                          Math.max(0, Math.floor(safeNumber(workoutForm.duration, 0))),
                          workoutForm.sets ? Math.floor(safeNumber(workoutForm.sets, 0)) : undefined,
                          workoutForm.reps ? Math.floor(safeNumber(workoutForm.reps, 0)) : undefined,
                          workoutForm.weight ? safeNumber(workoutForm.weight, 0) : undefined
                        )}
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIconContainer}>
                      <Ionicons name="search" size={32} color="#94a3b8" />
                    </View>
                    <Text style={styles.emptyStateText}>Pick an exercise to log</Text>
                    <Text style={styles.emptyStateSubtext}>Tap “Search Exercise Database” above.</Text>
                  </View>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalButtonSecondary}
                    onPress={() => setShowWorkoutModal(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, (!selectedExercise || !workoutForm.duration) && styles.modalButtonDisabled]}
                    onPress={logExercise}
                    disabled={!selectedExercise || !workoutForm.duration}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalButtonText}>Log Workout</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Exercise Search Modal */}
      <Modal
        visible={showExerciseSearch}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowExerciseSearch(false)}
      >
        <SafeAreaView style={styles.modalContent} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Search Exercises</Text>
            <TouchableOpacity onPress={() => setShowExerciseSearch(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search exercises..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#94a3b8"
                autoFocus
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              {workoutCategories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(category)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextActive]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView style={styles.searchResults} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {searchLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#2563eb" />
                  <Text style={styles.loadingText}>Searching exercises...</Text>
                </View>
              ) : (
                <>
                  {(searchQuery.trim() || selectedCategory !== 'All' ? searchResults : (exerciseLibrary || []).slice(0, 50)).map((exercise: ExerciseLibraryItem) => (
                    <TouchableOpacity
                      key={exercise._id}
                      style={styles.exerciseResultItem}
                      onPress={() => {
                        handleExerciseSelect(exercise);
                        setShowExerciseSearch(false);
                        setShowWorkoutModal(true);
                        setShowCustomExercise(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.exerciseResultInfo}>
                        <Text style={styles.exerciseResultName}>{exercise.name}</Text>
                        <Text style={styles.exerciseResultCategory}>
                          {exercise.category} • {exercise.type} • {exercise.met || 6} MET
                        </Text>
                        <Text style={styles.exerciseResultMuscles}>
                          {exercise.muscleGroups?.join(', ') || 'Full body'}
                        </Text>
                      </View>
                      <View style={styles.exerciseResultAdd}>
                        <Ionicons name="add" size={16} color="#2563eb" />
                      </View>
                    </TouchableOpacity>
                  ))}

                  {!searchLoading && searchQuery.trim() && searchResults.length === 0 ? (
                    <View style={styles.noResultsContainer}>
                      <Text style={styles.noResultsText}>No exercises found for "{searchQuery.trim()}"</Text>
                      <TouchableOpacity
                        style={[styles.modalButton, { marginTop: 12 }]}
                        onPress={() => {
                          setShowExerciseSearch(false);
                          setShowWorkoutModal(true);
                          setShowCustomExercise(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.modalButtonText}>Create Custom Exercise</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Steps Modal */}
      <Modal
        visible={showStepsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStepsModal(false)}
      >
        <SafeAreaView style={styles.modalContent} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Steps</Text>
            <TouchableOpacity onPress={() => setShowStepsModal(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
          </View>

          <View style={[styles.modalScroll, { paddingBottom: getBottomContentPadding(insets.bottom) }]}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Number of steps</Text>
              <TextInput
                style={styles.input}
                placeholder="Number of steps"
                value={stepsInput}
                onChangeText={setStepsInput}
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
            </View>

            {stepsInput ? (
              <Text style={styles.estimatedCalories}>
                Estimated calories: {Math.round(Math.max(0, safeNumber(stepsInput, 0)) * 0.04)}
              </Text>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowStepsModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, !stepsInput && styles.modalButtonDisabled]}
                onPress={addSteps}
                disabled={!stepsInput}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonText}>Add Steps</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
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
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  plusButton: {
    backgroundColor: '#3b82f6',
  },
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
  activitySummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 16,
  },
  summaryCard: {
    width: (width - 48 - 16) / 2,
    backgroundColor: '#ffffff',
    padding: isSmallScreen ? 12 : 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryIconContainer: {
    width: isSmallScreen ? 40 : 48,
    height: isSmallScreen ? 40 : 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 8 : 12,
  },
  summaryLabel: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#64748b',
    marginBottom: 4,
    minHeight: 16,
  },
  summaryValue: {
    fontSize: isSmallScreen ? 18 : 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
    minHeight: isSmallScreen ? 22 : 28,
  },
  summarySubtext: {
    fontSize: isSmallScreen ? 10 : 12,
    color: '#94a3b8',
    minHeight: 14,
  },
  addStepsLink: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
    marginTop: 4,
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
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  chartBarWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: 24,
    backgroundColor: '#2563eb',
    borderRadius: 4,
  },
  chartDay: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  weeklyStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  weeklyStatItem: {
    alignItems: 'center',
  },
  weeklyStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  weeklyStatLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  activitiesList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  activityDetails: {
    fontSize: 14,
    color: '#64748b',
  },
  activityRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  activityTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  deleteButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#f1f5f9',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  achievementsList: {
    gap: 12,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  // Modal styles
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
    borderBottomColor: '#e5e7eb',
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
  searchExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  searchExerciseButtonText: {
    fontSize: 16,
    color: '#64748b',
  },
  selectedExerciseCard: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  selectedExerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  selectedExerciseCategory: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  estimatedCalories: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalButtonSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  searchContainer: {
    flex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#1e293b',
  },
  categoriesScroll: {
    marginBottom: 16,
    paddingHorizontal: 20,
    flexGrow: 0,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#2563eb',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 12,
  },
  exerciseResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  exerciseResultInfo: {
    flex: 1,
  },
  exerciseResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  exerciseResultCategory: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  exerciseResultMuscles: {
    fontSize: 12,
    color: '#94a3b8',
  },
  exerciseResultAdd: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  deleteButtonNaked: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
});





