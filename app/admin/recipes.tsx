import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    Modal,
    TextInput,
    ActivityIndicator,
    Alert,
    Image,
    Dimensions
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
    Utensils,
    Plus,
    Search,
    Filter,
    Clock,
    Flame,
    ChevronRight,
    MoreVertical,
    X,
    Target
} from 'lucide-react-native';

export default function RecipesManager() {
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const recipes = useQuery(api.publicRecipes.list, {}); // Re-using existing query if available

    // Local state for new recipe
    const [newRecipe, setNewRecipe] = useState({
        title: '',
        description: '',
        calories: '0',
        protein: '0',
        carbs: '0',
        fat: '0',
        cookTime: '30',
        servings: '2',
    });

    const renderRecipeItem = ({ item }: { item: any }) => (
        <View style={styles.recipeCard}>
            <View style={styles.recipeImagePlaceholder}>
                <Utensils size={24} color="#cbd5e1" />
            </View>
            <View style={styles.recipeContent}>
                <View style={styles.recipeHeader}>
                    <Text style={styles.recipeTitle} numberOfLines={1}>{item.title}</Text>
                    <TouchableOpacity>
                        <MoreVertical size={16} color="#94a3b8" />
                    </TouchableOpacity>
                </View>
                <View style={styles.recipeMeta}>
                    <View style={styles.metaItem}>
                        <Flame size={12} color="#f59e0b" />
                        <Text style={styles.metaText}>{item.calories} kcal</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Clock size={12} color="#64748b" />
                        <Text style={styles.metaText}>{item.cookTimeMinutes} min</Text>
                    </View>
                    {item.isPremium && (
                        <View style={styles.premiumBadge}>
                            <Text style={styles.premiumText}>PRO</Text>
                        </View>
                    )}
                </View>
                <View style={styles.macroRow}>
                    <View style={styles.macroPill}>
                        <Text style={styles.macroPillText}>P: {item.protein}g</Text>
                    </View>
                    <View style={styles.macroPill}>
                        <Text style={styles.macroPillText}>C: {item.carbs}g</Text>
                    </View>
                    <View style={styles.macroPill}>
                        <Text style={styles.macroPillText}>F: {item.fat}g</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Recipes Manager</Text>
                    <Text style={styles.subtitle}>Curate and manage global food content</Text>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={() => setIsModalOpen(true)}>
                    <Plus color="#ffffff" size={20} />
                    <Text style={styles.addButtonText}>Add Recipe</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
                <Search size={18} color="#94a3b8" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search recipes..."
                    value={search}
                    onChangeText={setSearch}
                />
                <TouchableOpacity style={styles.filterButton}>
                    <Filter size={18} color="#64748b" />
                </TouchableOpacity>
            </View>

            {!recipes ? (
                <ActivityIndicator color="#2563eb" size="large" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={recipes}
                    renderItem={renderRecipeItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContent}
                    numColumns={width > 768 ? 2 : 1}
                    key={width > 768 ? 'grid' : 'list'}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Utensils size={48} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No public recipes found.</Text>
                        </View>
                    }
                />
            )}

            {/* Basic New Recipe Modal - Minimal for UI Demo */}
            <Modal visible={isModalOpen} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                            <X size={24} color="#64748b" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>New Recipe</Text>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                            <Text style={styles.modalSave}>Save</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalForm}>
                        <Text style={styles.label}>Recipe Title</Text>
                        <TextInput style={styles.input} placeholder="e.g. Avocado Toast Deluxe" />

                        <View style={styles.inputGrid}>
                            <View style={styles.inputField}>
                                <Text style={styles.label}>Calories</Text>
                                <TextInput style={styles.input} keyboardType="numeric" placeholder="0" />
                            </View>
                            <View style={styles.inputField}>
                                <Text style={styles.label}>Cook Time (min)</Text>
                                <TextInput style={styles.input} keyboardType="numeric" placeholder="30" />
                            </View>
                        </View>

                        <Text style={styles.label}>Description</Text>
                        <TextInput style={[styles.input, { height: 100 }]} multiline placeholder="Describe the recipe..." />

                        <Text style={styles.label}>Ingredients (one per line)</Text>
                        <TextInput style={[styles.input, { height: 150 }]} multiline placeholder="2 Eggs\n1 Avocado\n..." />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const { width } = Dimensions.get('window');

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
        backgroundColor: '#2563eb',
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
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        marginHorizontal: 24,
        paddingHorizontal: 16,
        height: 52,
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
    },
    filterButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 24,
        paddingTop: 0,
        gap: 16,
    },
    recipeCard: {
        flex: 1,
        margin: 8,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        flexDirection: 'row',
        padding: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    recipeImagePlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 14,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recipeContent: {
        flex: 1,
        marginLeft: 16,
    },
    recipeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    recipeTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1e293b',
        flex: 1,
    },
    recipeMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748b',
    },
    premiumBadge: {
        backgroundColor: '#fef3c7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    premiumText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#d97706',
    },
    macroRow: {
        flexDirection: 'row',
        gap: 6,
    },
    macroPill: {
        backgroundColor: '#f8fafc',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    macroPillText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#475569',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        gap: 12,
    },
    emptyText: {
        color: '#94a3b8',
        fontWeight: '600',
        fontSize: 15,
    },
    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1e293b',
    },
    modalSave: {
        color: '#2563eb',
        fontWeight: '800',
        fontSize: 16,
    },
    modalForm: {
        padding: 24,
    },
    label: {
        fontSize: 13,
        fontWeight: '800',
        color: '#64748b',
        marginBottom: 8,
        marginTop: 16,
        textTransform: 'uppercase',
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        color: '#1e293b',
        fontWeight: '600',
    },
    inputGrid: {
        flexDirection: 'row',
        gap: 16,
    },
    inputField: {
        flex: 1,
    }
});
