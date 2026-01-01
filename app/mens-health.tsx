import React, { useState, useEffect } from 'react';
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

export default function MensHealthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const sub = useSubscription();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [kegelActive, setKegelActive] = useState(false);
  const [kegelSeconds, setKegelSeconds] = useState(0);
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentStep, setAssessmentStep] = useState(0);
  const [riskScore, setRiskScore] = useState(0);

  const assessmentQuestions = [
    { q: "Do you exercise at least 150 mins per week?", points: 0 },
    { q: "Do you consume processed sugar daily?", points: 2 },
    { q: "Do you sleep less than 6 hours often?", points: 1 },
    { q: "Is your stress level high weekly?", points: 1 },
  ];

  function handleAssessmentAnswer(points: number) {
    const newScore = riskScore + points;
    setRiskScore(newScore);
    if (assessmentStep < assessmentQuestions.length - 1) {
      setAssessmentStep(assessmentStep + 1);
    } else {
      setShowAssessment(false);
      const risk = newScore > 3 ? "High" : newScore > 1 ? "Moderate" : "Low";
      Alert.alert('Assessment Complete', `Your lifestyle risk profile is: ${risk}`);
      setAssessmentStep(0);
      setRiskScore(0);
    }
  }

  useEffect(() => {
    if (!sub.isPro) setShowUpgrade(true);
  }, [sub.isPro]);

  useEffect(() => {
    let interval: any;
    if (kegelActive) {
      interval = setInterval(() => setKegelSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [kegelActive]);

  const logVitality = useMutation(api.healthHubs.logVitality);

  async function handleKegelComplete() {
    if (!convexUser?._id) return;
    setKegelActive(false);
    await logVitality({
      userId: convexUser._id,
      date: new Date().toISOString().slice(0, 10),
      mood: 5,
      stress: 'low',
      strength: 5,
      sleepQuality: 5,
      kegelCompleted: true
    });
    Alert.alert('Protocol Complete', 'Mens Vitality session logged.');
    setKegelSeconds(0);
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f1f5f9]" edges={['top', 'bottom']}>
      <View className="px-4 pb-3 flex-row items-center gap-3 bg-white border-b border-slate-200" style={{ paddingTop: Math.max(insets.top, 12) + 8 }}>
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-slate-900 font-black text-lg">Men’s Health</Text>
          <Text className="text-blue-600 font-bold text-xs">Male Vitality Protocol</Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-4 pt-6"
        contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom, 24) }}
      >
        {/* Kegel Timer Card */}
        <View className="bg-slate-900 rounded-[40px] p-8 mb-6 shadow-xl shadow-blue-900/20">
          <Text className="text-blue-400 font-black uppercase tracking-widest text-[10px] mb-2">Pelvic Floor Protocol</Text>
          <Text className="text-white font-black text-2xl mb-6">Kegel Training</Text>
          
          <View className="items-center justify-center py-4">
            <View className="w-32 h-32 rounded-full border-4 border-blue-500/30 items-center justify-center">
              <Text className="text-white text-4xl font-black">{Math.floor(kegelSeconds / 60)}:{(kegelSeconds % 60).toString().padStart(2, '0')}</Text>
            </View>
          </View>

          <TouchableOpacity 
            onPress={() => kegelActive ? handleKegelComplete() : setKegelActive(true)}
            className={`mt-8 py-5 rounded-3xl items-center ${kegelActive ? 'bg-blue-500' : 'bg-white'}`}
          >
            <Text className={`font-black text-lg ${kegelActive ? 'text-white' : 'text-slate-900'}`}>
              {kegelActive ? 'Finish Session' : 'Start Session'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Vitality Log */}
        <Text className="text-slate-900 font-black text-xl mb-4 px-2">Vitality Scorecard</Text>
        <View className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm mb-6">
          <View className="space-y-6">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-slate-900 font-black">Hormone Balance</Text>
                <Text className="text-slate-500 font-bold text-xs">Sleep/Stress/Strength correlation</Text>
              </View>
              <Text className="text-blue-600 font-black text-lg">Optimal</Text>
            </View>
            
            <View className="h-px bg-slate-100 mt-4 mb-4" />

            <TouchableOpacity 
              onPress={() => setShowAssessment(true)}
              className="flex-row justify-between items-center"
            >
              <View>
                <Text className="text-slate-900 font-black">Heart-Health Risk</Text>
                <Text className="text-slate-500 font-bold text-xs">Lifestyle-based assessment</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        </View>

        {showAssessment && (
          <View className="bg-slate-50 rounded-3xl p-6 border border-slate-200 mb-6">
            <Text className="text-slate-400 font-black uppercase text-[10px] mb-2">Question {assessmentStep + 1}/4</Text>
            <Text className="text-slate-900 font-black text-lg mb-6">{assessmentQuestions[assessmentStep].q}</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity 
                onPress={() => handleAssessmentAnswer(0)}
                className="flex-1 py-4 bg-white rounded-2xl border border-slate-200 items-center"
              >
                <Text className="text-slate-900 font-black">No / Never</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => handleAssessmentAnswer(assessmentQuestions[assessmentStep].points)}
                className="flex-1 py-4 bg-blue-600 rounded-2xl items-center"
              >
                <Text className="text-white font-black">Yes / Often</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Protocol Articles */}
        <Text className="text-slate-900 font-black text-xl mb-4 px-2">The Protocol</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
          {['Testosterone 101', 'Heart Health', 'Stress & Libido'].map((t, i) => (
            <TouchableOpacity key={i} className="bg-white rounded-[32px] p-6 mr-4 border border-slate-200 w-48 shadow-sm">
              <View className="w-10 h-10 rounded-2xl bg-blue-50 items-center justify-center mb-4">
                <Ionicons name="book" size={20} color="#2563eb" />
              </View>
              <Text className="text-slate-900 font-black leading-tight mb-2">{t}</Text>
              <Text className="text-slate-500 font-bold text-[10px] uppercase">5 min read</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>

      <ProUpgradeModal 
        visible={showUpgrade} 
        onClose={() => { setShowUpgrade(false); router.back(); }} 
        onUpgrade={() => { setShowUpgrade(false); router.push('/premium'); }}
        title="Men’s Health Pro"
        message="Unlock the Male Vitality Protocol, hormone tracking, and guided training sessions."
      />
    </SafeAreaView>
  );
}

