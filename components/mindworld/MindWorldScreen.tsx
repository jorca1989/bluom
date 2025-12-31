import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import GardenView from './GardenView';
import QuestSystem from './QuestSystem';
import XPBar from './XPBar';
import MindTokenBalance from './MindTokenBalance';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MeditationHub from '../MeditationHub';
import GamesHub from '../GamesHub';

export default function MindWorldScreen({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  const { user: clerkUser } = useUser();
  const user = useQuery(api.users.getUserByClerkId, clerkUser ? { clerkId: clerkUser.id } : "skip");
  const [activeTab, setActiveTab] = useState<'garden' | 'quests' | 'meditation' | 'games'>('garden');
  const [showMeditationHub, setShowMeditationHub] = useState(false);
  const [showGamesHub, setShowGamesHub] = useState(false);

  if (!visible) return null;

  if (!user) {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={styles.container}>
          <View style={styles.centered}>
            <Text>Loading Mind World...</Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>🌱 Mind Garden</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <XPBar userId={user._id} />
          <MindTokenBalance userId={user._id} />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {[
            { id: 'garden', label: '🌱 Garden' },
            { id: 'quests', label: '📋 Quests' },
            { id: 'meditation', label: '🧘 Meditate' },
            { id: 'games', label: '🎮 Games' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id as any)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <ScrollView style={styles.content}>
          {activeTab === 'garden' && (
            <GardenView
              userId={user._id}
              onNavigate={(screen) => setActiveTab(screen as any)}
            />
          )}

          {activeTab === 'quests' && (
            <QuestSystem userId={user._id} />
          )}

          {activeTab === 'meditation' && (
            <View style={styles.centered}>
              <Text style={styles.placeholderText}>Start a guided session or soundscape.</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setShowMeditationHub(true)}>
                <Text style={styles.primaryButtonText}>Open Meditation Hub</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'games' && (
            <View style={styles.centered}>
              <Text style={styles.placeholderText}>Play focus & mindfulness games.</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setShowGamesHub(true)}>
                <Text style={styles.primaryButtonText}>Open Games Hub</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {showMeditationHub && (
          <MeditationHub userId={user._id} onClose={() => setShowMeditationHub(false)} />
        )}
        {showGamesHub && (
          <GamesHub userId={user._id} onClose={() => setShowGamesHub(false)} />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, backgroundColor: '#f8fafc' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  closeButton: { padding: 4 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, padding: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#4CAF50' },
  tabText: { fontSize: 12, color: '#64748b' },
  tabTextActive: { color: '#4CAF50', fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  placeholderText: { color: '#64748b', textAlign: 'center', marginBottom: 16 },
  primaryButton: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
});

