import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import { useSubscription } from '@/context/SubscriptionProvider';
import { getBottomContentPadding } from '@/utils/layout';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';

export default function WomensHealthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const sub = useSubscription();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Pro Gate check
  React.useEffect(() => {
    if (!sub.isPro) {
      setShowUpgrade(true);
    }
  }, [sub.isPro]);

  const cycleLogs = useQuery(
    api.healthHubs.getCycleLogs,
    convexUser?._id ? { userId: convexUser._id, startDate: '2025-01-01', endDate: '2026-12-31' } : 'skip'
  );

  const logCycle = useMutation(api.healthHubs.logCycle);

  const currentLog = useMemo(() => {
    return cycleLogs?.find(l => l.date === selectedDate);
  }, [cycleLogs, selectedDate]);

  const symptomsList = ['Cramps', 'Headache', 'Bloating', 'Acne', 'Mood Swings', 'Fatigue'];
  const flowLevels = ['Light', 'Medium', 'Heavy', 'Spotting'];

  async function toggleSymptom(s: string) {
    if (!convexUser?._id) return;
    const currentSymptoms = currentLog?.symptoms ?? [];
    const nextSymptoms = currentSymptoms.includes(s) 
      ? currentSymptoms.filter(x => x !== s) 
      : [...currentSymptoms, s];
    
    await logCycle({
      userId: convexUser._id,
      date: selectedDate,
      symptoms: nextSymptoms,
      flow: currentLog?.flow
    });
  }

  async function setFlow(f: string) {
    if (!convexUser?._id) return;
    await logCycle({
      userId: convexUser._id,
      date: selectedDate,
      symptoms: currentLog?.symptoms ?? [],
      flow: f
    });
  }

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  // Simple week-view generator for now
  const weekDates = useMemo(() => {
    const dates = [];
    const today = new Date(selectedDate);
    const start = new Date(today);
    start.setDate(today.getDate() - 3);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  }, [selectedDate]);

  return (
    <SafeAreaView className="flex-1 bg-[#fff5f7]" edges={['top', 'bottom']}>
      <View className="px-4 pb-3 flex-row items-center gap-3 bg-white border-b border-rose-100" style={{ paddingTop: Math.max(insets.top, 12) + 8 }}>
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-xl bg-rose-50 items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#be185d" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-slate-900 font-black text-lg">Women’s Health</Text>
          <Text className="text-rose-500 font-bold text-xs">Cycle & Ovulation Tracker</Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom, 24) }}
      >
        {/* Calendar View */}
        <View className="bg-white p-4 mb-4 shadow-sm">
          <View className="flex-row justify-between mb-4">
            {weekDates.map((d, i) => {
              const isActive = d === selectedDate;
              const dayNum = d.split('-')[2];
              return (
                <TouchableOpacity 
                  key={i} 
                  onPress={() => setSelectedDate(d)}
                  className={`items-center justify-center w-10 h-14 rounded-2xl ${isActive ? 'bg-rose-500' : 'bg-rose-50'}`}
                >
                  <Text className={`text-[10px] font-bold ${isActive ? 'text-rose-100' : 'text-rose-400'}`}>{days[new Date(d).getDay()]}</Text>
                  <Text className={`text-base font-black ${isActive ? 'text-white' : 'text-rose-700'}`}>{dayNum}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          
          <View className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
            <View className="flex-row items-center gap-2 mb-1">
              <Ionicons name="sparkles" size={16} color="#be185d" />
              <Text className="text-rose-900 font-black">Prediction</Text>
            </View>
            <Text className="text-rose-700 font-bold text-sm">
              Ovulation predicted in <Text className="text-rose-900 font-black">4 days</Text>. High fertility window starts tomorrow.
            </Text>
          </View>
        </View>

        {/* Logging Sections */}
        <View className="px-4">
          <Text className="text-slate-900 font-black text-lg mb-3">Flow Level</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {flowLevels.map((f) => (
              <TouchableOpacity 
                key={f}
                onPress={() => setFlow(f)}
                className={`px-5 py-3 rounded-2xl border ${currentLog?.flow === f ? 'bg-rose-500 border-rose-600' : 'bg-white border-slate-200'}`}
              >
                <Text className={`font-black ${currentLog?.flow === f ? 'text-white' : 'text-slate-600'}`}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-slate-900 font-black text-lg mb-3">Symptoms</Text>
          <View className="flex-row flex-wrap gap-2">
            {symptomsList.map((s) => {
              const active = currentLog?.symptoms?.includes(s);
              return (
                <TouchableOpacity 
                  key={s}
                  onPress={() => toggleSymptom(s)}
                  className={`px-5 py-3 rounded-2xl border ${active ? 'bg-rose-100 border-rose-300' : 'bg-white border-slate-200'}`}
                >
                  <Text className={`font-black ${active ? 'text-rose-700' : 'text-slate-600'}`}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="mt-8 px-4">
          <View className="bg-white rounded-3xl p-6 border border-rose-100 shadow-sm">
            <Text className="text-slate-900 font-black text-lg mb-2">Cycle Insights</Text>
            <View className="space-y-4">
              <View className="flex-row justify-between items-center mt-2">
                <Text className="text-slate-500 font-bold">Average Cycle</Text>
                <Text className="text-slate-900 font-black">28 Days</Text>
              </View>
              <View className="flex-row justify-between items-center mt-2">
                <Text className="text-slate-500 font-bold">Next Period</Text>
                <Text className="text-slate-900 font-black">Feb 14</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <ProUpgradeModal 
        visible={showUpgrade} 
        onClose={() => { setShowUpgrade(false); router.back(); }} 
        onUpgrade={() => { setShowUpgrade(false); router.push('/premium'); }}
        title="Women’s Health Pro"
        message="Upgrade to Pro to track your cycle, predict ovulation, and get personalized symptom insights."
      />
    </SafeAreaView>
  );
}

