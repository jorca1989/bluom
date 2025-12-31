import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    ActivityIndicator
} from 'react-native';
import {
    Sparkles,
    Plus,
    Headphones,
    Clock,
    Play,
    MoreVertical,
    ChevronRight
} from 'lucide-react-native';

export default function MeditationsManager() {
    const meditationData = [
        { _id: '1', title: 'Deep Sleep Journey', category: 'Sleep', duration: '20:00', sessions: 1240 },
        { _id: '2', title: 'Morning Gratitude', category: 'Morning', duration: '10:00', sessions: 850 },
        { _id: '3', title: 'Anxiety Release', category: 'Mental Health', duration: '15:00', sessions: 2100 },
    ];

    const renderMeditation = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.iconBox}>
                <Headphones size={24} color="#8b5cf6" />
            </View>
            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={styles.medTitle}>{item.title}</Text>
                    <Text style={styles.catBadge}>{item.category.toUpperCase()}</Text>
                </View>
                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <Clock size={12} color="#94a3b8" />
                        <Text style={styles.metaText}>{item.duration}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Play size={10} color="#94a3b8" />
                        <Text style={styles.metaText}>{item.sessions} plays</Text>
                    </View>
                </View>
            </View>
            <TouchableOpacity style={styles.actionBtn}>
                <ChevronRight size={20} color="#cbd5e1" />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Meditations Hub</Text>
                    <Text style={styles.subtitle}>Curate audio wellness and mindfulness sessions</Text>
                </View>
                <TouchableOpacity style={styles.addButton}>
                    <Plus color="#ffffff" size={20} />
                    <Text style={styles.addButtonText}>Add Session</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={meditationData}
                renderItem={renderMeditation}
                keyExtractor={item => item._id}
                contentContainerStyle={styles.list}
                ListHeaderComponent={
                    <View style={styles.statsSummary}>
                        <View style={styles.summaryBox}>
                            <Text style={styles.summaryVal}>42</Text>
                            <Text style={styles.summaryLabel}>Total Tracks</Text>
                        </View>
                        <View style={styles.summaryBox}>
                            <Text style={styles.summaryVal}>12.4k</Text>
                            <Text style={styles.summaryLabel}>Total Plays</Text>
                        </View>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: '#1e293b',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
        marginTop: 4,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8b5cf6', // Meditation focus color
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
    },
    addButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 14,
    },
    list: {
        padding: 24,
        paddingTop: 0,
        gap: 12,
    },
    statsSummary: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    summaryBox: {
        flex: 1,
        backgroundColor: '#ffffff',
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    summaryVal: {
        fontSize: 24,
        fontWeight: '900',
        color: '#1e293b',
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
        marginTop: 4,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
        marginBottom: 12,
    },
    iconBox: {
        width: 60,
        height: 60,
        borderRadius: 14,
        backgroundColor: '#f5f3ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        marginLeft: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    medTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1e293b',
        flex: 1,
    },
    catBadge: {
        fontSize: 9,
        fontWeight: '900',
        color: '#8b5cf6',
        backgroundColor: '#f5f3ff',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94a3b8',
    },
    actionBtn: {
        padding: 8,
    }
});
