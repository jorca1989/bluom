import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { CircularProgress } from '@/components/CircularProgress';
import { SugarScanModal, SugarScanResult } from '@/components/SugarScanModal';
import { getBottomContentPadding } from '@/utils/layout';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';
import { useSubscription } from '@/context/SubscriptionProvider';
import { useCelebration } from '@/context/CelebrationContext';

export default function SugarDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const sub = useSubscription();
  const celebration = useCelebration();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const progress = useQuery(
    api.sugar.getResetProgress,
    convexUser?._id ? { userId: convexUser._id, days: 90, asOf: today } : 'skip'
  );
  const todayLog = useQuery(
    api.sugar.getDailyStatus,
    convexUser?._id ? { userId: convexUser._id, date: today } : 'skip'
  );
  const streaks = useQuery(
    api.streaks.getMetricStreaks,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  );

  const saveDaily = useMutation(api.sugar.logDailyStatus);

  const [showScan, setShowScan] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSugarFree, setIsSugarFree] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const pct = Math.round((progress?.progress ?? 0) * 100);
  const streak = progress?.streak ?? 0;

  async function handleSave() {
    if (!convexUser?._id) return;
    if (isSugarFree === null) {
      Alert.alert('Daily check-in', 'Choose Sugar‑free or Had sugar.');
      return;
    }
    setSaving(true);
    try {
      await saveDaily({
        userId: convexUser._id,
        date: today,
        isSugarFree,
        notes: notes.trim() || undefined,
      });
      celebration.trigger('fireworks');
      Alert.alert('Saved', 'Daily check‑in saved.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ? String(e.message) : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  const handleScanResult = (res: SugarScanResult) => {
    router.push({
      pathname: '/sugar-scan-result',
      params: {
        productName: res.productName,
        sugar: String(res.estimatedSugarGrams ?? 0),
        calories: String(res.estimatedCalories ?? 0),
        alternative: res.smartAlternative ?? '',
        notes: res.notes ?? '',
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#ebf1fe]" edges={['top', 'bottom']}>
      <View className="px-4 pb-3 flex-row items-center gap-3 bg-white border-b border-slate-200" style={{ paddingTop: Math.max(insets.top, 12) + 8 }}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.85} className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-slate-900 font-extrabold text-lg">Sugar Control</Text>
          <Text className="text-slate-500 font-bold text-xs">Brain rewiring • scan • daily check‑in</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: getBottomContentPadding(insets.bottom, 24) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top: Brain rewiring */}
        <View className="bg-white border border-slate-200 rounded-2xl p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-slate-900 font-extrabold text-base">Brain Rewiring</Text>
              <Text className="text-slate-500 font-bold text-xs mt-1">90‑day progress</Text>
            </View>
            <View className="bg-orange-50 border border-orange-200 rounded-full px-3 py-1 flex-row items-center gap-1">
              <Ionicons name="flame" size={14} color="#f97316" />
              <Text className="text-orange-800 font-extrabold">{streaks?.sugar ?? streak}d streak</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-4 mt-4">
            <View className="items-center justify-center">
              <CircularProgress progress={(progress?.progress ?? 0)} size={96} strokeWidth={10} />
              <View className="absolute items-center justify-center">
                <Text className="text-slate-900 font-black text-lg">{pct}%</Text>
                <Text className="text-slate-500 font-bold text-[10px]">rewired</Text>
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-slate-700 font-bold leading-5">
                Keep stacking sugar‑free days. Small wins compound.
              </Text>
              <Text className="text-slate-500 font-semibold mt-2 text-xs">
                Tip: scan products before you buy.
              </Text>
            </View>
          </View>
        </View>

        {/* Streaks Summary */}
        <View className="mt-4 flex-row flex-wrap justify-between">
          <View className="bg-white border border-slate-200 rounded-2xl p-4 w-[48%] mb-3">
            <View className="flex-row items-center gap-2 mb-1">
              <Ionicons name="water" size={16} color="#3b82f6" />
              <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Water</Text>
            </View>
            <View className="flex-row items-baseline gap-1">
              <Text className="text-slate-900 font-black text-xl">{streaks?.water ?? 0}</Text>
              <Text className="text-slate-400 font-bold text-[10px]">DAYS</Text>
            </View>
          </View>
          <View className="bg-white border border-slate-200 rounded-2xl p-4 w-[48%] mb-3">
            <View className="flex-row items-center gap-2 mb-1">
              <Ionicons name="barbell" size={16} color="#10b981" />
              <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Workout</Text>
            </View>
            <View className="flex-row items-baseline gap-1">
              <Text className="text-slate-900 font-black text-xl">{streaks?.workout ?? 0}</Text>
              <Text className="text-slate-400 font-bold text-[10px]">DAYS</Text>
            </View>
          </View>
        </View>

        <View className="flex-row flex-wrap justify-between">
          <View className="bg-white border border-slate-200 rounded-2xl p-4 w-[48%] mb-3">
            <View className="flex-row items-center gap-2 mb-1">
              <Ionicons name="moon" size={16} color="#8b5cf6" />
              <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Sleep</Text>
            </View>
            <View className="flex-row items-baseline gap-1">
              <Text className="text-slate-900 font-black text-xl">{streaks?.sleep ?? 0}</Text>
              <Text className="text-slate-400 font-bold text-[10px]">DAYS</Text>
            </View>
          </View>
          <View className="bg-white border border-slate-200 rounded-2xl p-4 w-[48%] mb-3">
            <View className="flex-row items-center gap-2 mb-1">
              <Ionicons name="happy" size={16} color="#f59e0b" />
              <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Mood</Text>
            </View>
            <View className="flex-row items-baseline gap-1">
              <Text className="text-slate-900 font-black text-xl">{streaks?.mood ?? 0}</Text>
              <Text className="text-slate-400 font-bold text-[10px]">DAYS</Text>
            </View>
          </View>
          <View className="bg-white border border-slate-200 rounded-2xl p-4 w-[48%] mb-3">
            <View className="flex-row items-center gap-2 mb-1">
              <Ionicons name="leaf" size={16} color="#10b981" />
              <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Mind</Text>
            </View>
            <View className="flex-row items-baseline gap-1">
              <Text className="text-slate-900 font-black text-xl">{streaks?.meditation ?? 0}</Text>
              <Text className="text-slate-400 font-bold text-[10px]">DAYS</Text>
            </View>
          </View>
        </View>

        {/* Middle: Scan product */}
        <TouchableOpacity
          onPress={() => setShowScan(true)}
          activeOpacity={0.9}
          className="mt-4 bg-slate-900 rounded-3xl px-5 py-5 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-2xl bg-white/10 items-center justify-center">
              <Ionicons name="camera" size={22} color="#fff" />
            </View>
            <View>
              <Text className="text-white font-extrabold text-lg">Scan Product</Text>
              <Text className="text-white/70 font-bold text-xs">Detect sugar + calories + alternatives</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Bottom: Daily check-in */}
        <View className="mt-4 bg-white border border-slate-200 rounded-2xl p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-slate-900 font-extrabold text-base">Daily Check‑in</Text>
            <Text className="text-slate-500 font-bold text-xs">{today}</Text>
          </View>

          <Text className="text-slate-600 font-semibold mt-2">
            {todayLog ? 'Update your check‑in' : 'Log your day'}
          </Text>

          <View className="flex-row gap-3 mt-3">
            <TouchableOpacity
              onPress={() => setIsSugarFree(true)}
              activeOpacity={0.85}
              className={`flex-1 rounded-2xl border px-4 py-3 items-center ${isSugarFree === true ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}
            >
              <Text className={`font-extrabold ${isSugarFree === true ? 'text-emerald-700' : 'text-slate-700'}`}>Sugar‑free</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsSugarFree(false)}
              activeOpacity={0.85}
              className={`flex-1 rounded-2xl border px-4 py-3 items-center ${isSugarFree === false ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}
            >
              <Text className={`font-extrabold ${isSugarFree === false ? 'text-rose-700' : 'text-slate-700'}`}>Had sugar</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)…"
            placeholderTextColor="#94a3b8"
            className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 font-semibold"
          />

          <TouchableOpacity
            onPress={() => {
              if (!sub.isPro) {
                // Allow free users to check in? You asked gating mainly on alternatives/saves for scans.
                // We keep check-in free for now; toggle this if you want.
              }
              handleSave();
            }}
            activeOpacity={0.9}
            className={`mt-3 rounded-2xl py-4 items-center ${saving ? 'bg-slate-300' : 'bg-blue-600'}`}
            disabled={saving}
          >
            <Text className="text-white font-extrabold">{saving ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SugarScanModal visible={showScan} onClose={() => setShowScan(false)} onResult={handleScanResult} />

      <ProUpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => {
          setShowUpgrade(false);
          router.push('/premium');
        }}
        title="Unlock with Pro"
        message="Upgrade to Pro to unlock premium Sugar Control insights."
        upgradeLabel="View Pro Plans"
      />
    </SafeAreaView>
  );
}


