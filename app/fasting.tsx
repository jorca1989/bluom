import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import { useSubscription } from '@/context/SubscriptionProvider';
import { CircularProgress } from '@/components/CircularProgress';
import { getBottomContentPadding } from '@/utils/layout';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';

export default function FastingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const sub = useSubscription();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const activeLog = useQuery(
    api.fasting.getActiveFastingLog,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  );

  const startFasting = useMutation(api.fasting.startFasting);
  const endFasting = useMutation(api.fasting.endFasting);

  const [now, setNow] = useState(Date.now());
  const [protocol, setProtocol] = useState('16:8');
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedMs = activeLog ? now - activeLog.startTime : 0;
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  
  const targetHours = useMemo(() => {
    const p = activeLog?.protocol ?? protocol;
    return parseInt(p.split(':')[0]);
  }, [activeLog, protocol]);

  const progress = Math.min(1, elapsedHours / targetHours);

  const bodyStatus = useMemo(() => {
    if (!activeLog) return { label: 'Not Fasting', desc: 'Ready to start?', color: '#64748b' };
    if (elapsedHours < 12) return { label: 'Sugar Drop', desc: 'Blood sugar is stabilizing.', color: '#3b82f6' };
    if (elapsedHours < 18) return { label: 'Fat Burn', desc: 'Entering ketosis state.', color: '#f59e0b' };
    return { label: 'Autophagy', desc: 'Cellular cleanup active.', color: '#10b981' };
  }, [activeLog, elapsedHours]);

  async function handleStart() {
    if (!convexUser?._id) return;
    await startFasting({
      userId: convexUser._id,
      protocol,
      startTime: Date.now()
    });
  }

  async function handleEnd() {
    if (!convexUser?._id) return;
    await endFasting({
      userId: convexUser._id,
      endTime: Date.now()
    });
    Alert.alert('Fast Ended', `Total time: ${Math.floor(elapsedHours)}h ${Math.floor((elapsedHours % 1) * 60)}m`);
  }

  const formatTime = (ms: number) => {
    const h = Math.floor(ms / (1000 * 60 * 60));
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((ms % (1000 * 60)) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      <View className="px-4 pb-3 flex-row items-center gap-3 bg-white border-b border-slate-200" style={{ paddingTop: Math.max(insets.top, 12) + 8 }}>
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-slate-900 font-black text-lg">Intermittent Fasting</Text>
          <Text className="text-slate-500 font-bold text-xs">Precision metabolic tracking</Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-4 pt-6"
        contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom, 24) }}
      >
        <View className="bg-white rounded-[40px] p-10 items-center border border-slate-100 shadow-sm">
          <View className="relative items-center justify-center">
            <CircularProgress 
              progress={activeLog ? progress : 0} 
              size={240} 
              strokeWidth={15} 
              progressColor={bodyStatus.color}
              trackColor="#f1f5f9"
            />
            <View className="absolute items-center">
              <Text className="text-slate-400 font-black uppercase tracking-widest text-[10px] mb-1">Elapsed Time</Text>
              <Text className="text-slate-900 font-black text-4xl tabular-nums">{formatTime(elapsedMs)}</Text>
              <Text className="text-slate-500 font-bold mt-1">Goal: {targetHours}h</Text>
            </View>
          </View>

          <View className="mt-8 items-center">
            <View style={{ backgroundColor: bodyStatus.color + '20' }} className="px-4 py-1 rounded-full border" >
              <Text style={{ color: bodyStatus.color }} className="font-black uppercase text-[10px] tracking-widest">{bodyStatus.label}</Text>
            </View>
            <Text className="text-slate-600 font-bold text-center mt-2 leading-5">{bodyStatus.desc}</Text>
          </View>

          <TouchableOpacity 
            onPress={() => {
              if (!sub.isPro) {
                setShowUpgrade(true);
              } else {
                activeLog ? handleEnd() : handleStart();
              }
            }}
            className={`mt-10 w-full py-5 rounded-3xl items-center shadow-xl ${activeLog ? 'bg-slate-900' : 'bg-blue-600'}`}
          >
            <Text className="text-white font-black text-lg">
              {activeLog ? 'End Fasting' : 'Start Fasting'}
            </Text>
          </TouchableOpacity>
        </View>

        {!activeLog && (
          <View className="mt-6">
            <Text className="text-slate-900 font-black text-lg mb-3 px-2">Choose Protocol</Text>
            <View className="flex-row gap-2">
              {['16:8', '18:6', '20:4'].map((p) => (
                <TouchableOpacity 
                  key={p} 
                  onPress={() => setProtocol(p)}
                  className={`flex-1 py-4 rounded-2xl border items-center ${protocol === p ? 'bg-blue-50 border-blue-600' : 'bg-white border-slate-200'}`}
                >
                  <Text className={`font-black ${protocol === p ? 'text-blue-600' : 'text-slate-500'}`}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View className="mt-8 bg-white rounded-3xl p-6 border border-slate-200">
          <Text className="text-slate-900 font-black text-lg mb-4">Metabolic Phases</Text>
          <View className="space-y-4">
            <PhaseRow label="Sugar Drop" time="0-12h" color="#3b82f6" active={elapsedHours >= 0 && elapsedHours < 12 && !!activeLog} />
            <PhaseRow label="Fat Burn" time="12-18h" color="#f59e0b" active={elapsedHours >= 12 && elapsedHours < 18 && !!activeLog} />
            <PhaseRow label="Autophagy" time="18h+" color="#10b981" active={elapsedHours >= 18 && !!activeLog} />
          </View>
        </View>
      </ScrollView>

      <ProUpgradeModal 
        visible={showUpgrade} 
        onClose={() => { setShowUpgrade(false); router.back(); }} 
        onUpgrade={() => { setShowUpgrade(false); router.push('/premium'); }}
        title="Fasting Tracker Pro"
        message="Unlock protocol customization, metabolic phase insights, and long-term fasting history."
      />
    </SafeAreaView>
  );
}

function PhaseRow({ label, time, color, active }: { label: string, time: string, color: string, active: boolean }) {
  return (
    <View className={`flex-row items-center justify-between p-3 rounded-2xl ${active ? 'bg-slate-50 border border-slate-100' : ''}`}>
      <View className="flex-row items-center gap-3">
        <View style={{ backgroundColor: color }} className="w-2 h-2 rounded-full" />
        <Text className={`font-black ${active ? 'text-slate-900' : 'text-slate-400'}`}>{label}</Text>
      </View>
      <Text className={`font-bold text-xs ${active ? 'text-slate-600' : 'text-slate-300'}`}>{time}</Text>
    </View>
  );
}

