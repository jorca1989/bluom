import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Modal,
  FlatList,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Camera, Activity, Heart, TrendingUp, Sparkles } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import type {
  BiologicalSex,
  FitnessGoal,
  ActivityLevel,
  FitnessExperience,
  WorkoutPreference,
  NutritionApproach,
  StressLevel,
} from '@/types';

const { width } = Dimensions.get('window');

interface Question {
  id: string;
  question: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'number_with_units' | 'height_input' | 'select_with_info';
  placeholder?: string;
  options?: string[];
  units?: string[];
  subtitle?: string;
  hasInfo?: boolean;
  min?: number;
  max?: number;
}

export default function OnboardingScreen() {
  const { user: clerkUser } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const onboardUser = useMutation(api.onboarding.onboardUser);
  const generateAllPlans = useMutation(api.plans.generateAllPlans);

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const [showWelcome, setShowWelcome] = useState(!clerkUser);
  const [welcomeIndex, setWelcomeIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [units, setUnits] = useState<{
    weight: 'lbs' | 'kg';
    height: 'ft' | 'cm';
  }>({
    weight: 'lbs',
    height: 'ft'
  });

  const [showResults, setShowResults] = useState(false);
  const [calculatedResults, setCalculatedResults] = useState<any>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoContent, setInfoContent] = useState({ title: '', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is authenticated AND has data
    if (clerkUser && convexUser && convexUser.age > 0) {
      console.log('User has existing data. Auto-advancing to dashboard.');
      router.replace('/(tabs)');
    }
  }, [clerkUser, convexUser, router]);

  const welcomeSlides = [
    {
      id: '1',
      title: 'Welcome to BloomYou',
      subtitle: 'Your all-in-one wellness companion',
      description: 'Transform your health journey with AI-powered nutrition, personalized workouts, and mental wellness tracking.',
      icon: Sparkles,
      colors: ['#60A5FA', '#2563EB'] as [string, string],
      bgColor: '#EFF6FF',
    },
    {
      id: '2',
      title: 'AI Food Recognition',
      subtitle: 'Snap, track, and optimize',
      description: 'Take a photo of your meal and our AI instantly recognizes ingredients and calculates your macros.',
      icon: Camera,
      colors: ['#4ADE80', '#059669'] as [string, string],
      bgColor: '#F0FDF4',
    },
    {
      id: '3',
      title: 'Smart Workouts',
      subtitle: 'Personalized fitness plans',
      description: 'Get custom workout routines that adapt to your goals. Track exercises, calories burned, and progress.',
      icon: Activity,
      colors: ['#FB923C', '#EF4444'] as [string, string],
      bgColor: '#FFF7ED',
    },
    {
      id: '4',
      title: 'Mental Wellness',
      subtitle: 'Build healthy habits daily',
      description: 'Track your sleep, mood, and daily habits. Create streaks and cultivate a balanced lifestyle.',
      icon: Heart,
      colors: ['#A78BFA', '#4F46E5'] as [string, string],
      bgColor: '#F5F3FF',
    },
    {
      id: '5',
      title: 'Track Your Progress',
      subtitle: 'See your transformation',
      description: 'Comprehensive insights across nutrition, workouts, and wellness. Celebrate every milestone.',
      icon: TrendingUp,
      colors: ['#F472B6', '#F43F5E'] as [string, string],
      bgColor: '#FDF2F8',
    },
  ];

  const nutritionInfo: { [key: string]: { title: string; description: string } } = {
    'High Protein': {
      title: 'High Protein Diet',
      description: 'Emphasizes protein-rich foods (30-35% of calories). Great for muscle building, weight loss, and satiety. Includes lean meats, fish, eggs, dairy, legumes, and protein supplements.'
    },
    'Low Carb': {
      title: 'Low Carb Diet',
      description: 'Restricts carbohydrates (20-25% of calories), focusing on proteins and fats. Can help with weight loss and blood sugar control. Limits grains, sugars, and starchy vegetables.'
    },
    'Balanced': {
      title: 'Balanced Diet',
      description: 'Follows standard macronutrient ratios (50% carbs, 25% protein, 25% fat). Includes all food groups in moderation for overall health and sustainability.'
    },
    'Plant-Based': {
      title: 'Plant-Based Diet',
      description: 'Focuses on foods derived from plants including vegetables, fruits, nuts, seeds, oils, whole grains, legumes, and beans. May include or exclude animal products.'
    },
    'Flexible Dieting': {
      title: 'Flexible Dieting (IIFYM)',
      description: 'If It Fits Your Macros - allows any food as long as it fits within daily macro targets. Provides flexibility while maintaining nutritional goals.'
    }
  };

  const questions: Question[] = [
    {
      id: 'name',
      question: "What's your name?",
      type: 'text',
      placeholder: 'Enter your name',
    },
    {
      id: 'gender',
      question: 'What is your biological sex?',
      type: 'select',
      options: ['Male', 'Female'],
      subtitle: 'This helps us calculate accurate calorie and macro targets'
    },
    {
      id: 'age',
      question: 'How old are you?',
      type: 'number',
      placeholder: 'Enter your age',
      min: 13,
      max: 100
    },
    {
      id: 'weight',
      question: 'What is your current weight?',
      type: 'number_with_units',
      units: ['lbs', 'kg'],
      placeholder: 'Enter your weight',
    },
    {
      id: 'height',
      question: 'How tall are you?',
      type: 'height_input',
      units: ['ft', 'cm'],
      placeholder: 'Enter your height',
    },
    {
      id: 'fitnessGoal',
      question: 'What is your primary fitness goal?',
      type: 'select',
      options: ['Lose Weight', 'Build Muscle', 'Maintain Weight', 'Improve Endurance', 'General Health'],
      subtitle: 'This determines your calorie target and macro distribution'
    },
    {
      id: 'targetWeight',
      question: 'What is your target weight?',
      type: 'number_with_units',
      units: ['lbs', 'kg'],
      placeholder: 'Enter your target weight',
      subtitle: 'Optional - helps us set realistic timelines'
    },
    {
      id: 'experience',
      question: 'What is your fitness experience level?',
      type: 'select',
      options: ['Beginner', 'Intermediate', 'Advanced'],
      subtitle: 'Affects workout intensity and progression recommendations'
    },
    {
      id: 'workoutPreference',
      question: 'What type of workouts do you prefer?',
      type: 'select',
      options: ['Strength Training', 'Cardio', 'HIIT', 'Flexibility/Yoga', 'Mixed'],
    },
    {
      id: 'timeAvailable',
      question: 'How much time can you dedicate to workouts per week?',
      type: 'select',
      options: ['Less than 2 hours', '2-4 hours', '4-6 hours', '6-8 hours', 'More than 8 hours'],
    },
    {
      id: 'activityLevel',
      question: 'How would you describe your daily activity level?',
      type: 'select',
      options: [
        'Sedentary (desk job, little exercise)',
        'Lightly Active (light exercise 1-3 days/week)',
        'Moderately Active (moderate exercise 3-5 days/week)',
        'Very Active (hard exercise 6-7 days/week)',
        'Extremely Active (very hard exercise, physical job)'
      ],
      subtitle: 'This significantly affects your daily calorie needs'
    },
    {
      id: 'nutritionPreference',
      question: 'What nutrition approach interests you most?',
      type: 'select_with_info',
      options: ['High Protein', 'Low Carb', 'Balanced', 'Plant-Based', 'Flexible Dieting'],
      subtitle: 'Affects your macro distribution recommendations',
      hasInfo: true
    },
    {
      id: 'sleepHours',
      question: 'How many hours do you typically sleep per night?',
      type: 'number',
      placeholder: 'Enter hours of sleep',
      min: 4,
      max: 12,
      subtitle: 'Sleep affects metabolism and recovery'
    },
    {
      id: 'stressLevel',
      question: 'How would you rate your typical stress level?',
      type: 'select',
      options: ['Low', 'Moderate', 'High', 'Very High'],
      subtitle: 'Stress affects cortisol levels and weight management'
    },
    {
      id: 'motivation',
      question: 'What motivates you most? (Select all that apply)',
      type: 'multiselect',
      options: ['Health', 'Appearance', 'Energy', 'Strength', 'Confidence', 'Competition', 'Longevity'],
    },
    {
      id: 'challenges',
      question: 'What are your biggest fitness challenges?',
      type: 'multiselect',
      options: ['Time', 'Motivation', 'Knowledge', 'Consistency', 'Injury/Pain', 'Equipment', 'Diet', 'Social Support'],
    },
    {
      id: 'mealFrequency',
      question: 'How many meals do you prefer to eat per day?',
      type: 'select',
      options: ['2 meals', '3 meals', '4-5 small meals', '6+ small meals', 'Intermittent fasting'],
      subtitle: 'Helps us suggest meal timing and portion sizes'
    },
    {
      id: 'goal',
      question: 'What would you like to achieve in the next 3 months?',
      type: 'text',
      placeholder: 'Describe your 3-month goal',
    },
  ];

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setWelcomeIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollToNext = () => {
    if (welcomeIndex < welcomeSlides.length - 1) {
      slidesRef.current?.scrollToIndex({ index: welcomeIndex + 1 });
    } else {
      if (!clerkUser) {
        console.log('Slider complete, guest user. Redirecting to login.');
        router.replace('/(auth)/login');
      } else {
        console.log('Slider complete, authenticated user. Proceeding to questionnaire.');
        setShowWelcome(false);
      }
    }
  };

  const handleAnswer = (value: any) => {
    setAnswers({ ...answers, [questions[currentStep].id]: value });
  };

  const handleUnitChange = (type: 'weight' | 'height', unit: string) => {
    setUnits({ ...units, [type]: unit });
  };

  const showInfo = (option: string) => {
    const info = nutritionInfo[option];
    if (info) {
      setInfoContent(info);
      setShowInfoModal(true);
    }
  };

  // Map UI values to schema enums
  const mapToSchemaValues = () => {
    const genderMap: { [key: string]: BiologicalSex } = {
      'Male': 'male',
      'Female': 'female'
    };

    const goalMap: { [key: string]: FitnessGoal } = {
      'Lose Weight': 'lose_weight',
      'Build Muscle': 'build_muscle',
      'Maintain Weight': 'maintain',
      'Improve Endurance': 'improve_health',
      'General Health': 'improve_health'
    };

    const experienceMap: { [key: string]: FitnessExperience } = {
      'Beginner': 'beginner',
      'Intermediate': 'intermediate',
      'Advanced': 'advanced'
    };

    const workoutMap: { [key: string]: WorkoutPreference } = {
      'Strength Training': 'strength',
      'Cardio': 'cardio',
      'HIIT': 'hiit',
      'Flexibility/Yoga': 'yoga',
      'Mixed': 'mixed'
    };

    const activityMap: { [key: string]: ActivityLevel } = {
      'Sedentary (desk job, little exercise)': 'sedentary',
      'Lightly Active (light exercise 1-3 days/week)': 'lightly_active',
      'Moderately Active (moderate exercise 3-5 days/week)': 'moderately_active',
      'Very Active (hard exercise 6-7 days/week)': 'very_active',
      'Extremely Active (very hard exercise, physical job)': 'extremely_active'
    };

    const nutritionMap: { [key: string]: NutritionApproach } = {
      'High Protein': 'high_protein',
      'Low Carb': 'low_carb',
      'Balanced': 'balanced',
      'Plant-Based': 'plant_based',
      'Flexible Dieting': 'flexible'
    };

    const stressMap: { [key: string]: StressLevel } = {
      'Low': 'low',
      'Moderate': 'moderate',
      'High': 'high',
      'Very High': 'very_high'
    };

    const timeMap: { [key: string]: string } = {
      'Less than 2 hours': '1',
      '2-4 hours': '3',
      '4-6 hours': '5',
      '6-8 hours': '7',
      'More than 8 hours': '10'
    };

    const mealMap: { [key: string]: string } = {
      '2 meals': '2',
      '3 meals': '3',
      '4-5 small meals': '4',
      '6+ small meals': '6',
      'Intermittent fasting': '2'
    };

    // Convert weight to kg for calculations
    const weightInKg = units.weight === 'kg'
      ? parseFloat(answers.weight)
      : parseFloat(answers.weight) * 0.453592;

    // Convert height to cm for calculations
    const heightInCm = units.height === 'cm'
      ? parseFloat(answers.height)
      : (Math.floor(answers.height) * 30.48) + ((answers.height % 1) * 12 * 2.54);

    const targetWeightInKg = answers.targetWeight
      ? (units.weight === 'kg'
        ? parseFloat(answers.targetWeight)
        : parseFloat(answers.targetWeight) * 0.453592)
      : undefined;

    return {
      name: answers.name,
      biologicalSex: genderMap[answers.gender],
      age: answers.age.toString(),
      weight: weightInKg.toString(),
      height: heightInCm.toString(),
      targetWeight: targetWeightInKg?.toString(),
      fitnessGoal: goalMap[answers.fitnessGoal],
      fitnessExperience: experienceMap[answers.experience],
      workoutPreference: workoutMap[answers.workoutPreference],
      weeklyWorkoutTime: timeMap[answers.timeAvailable] || '3',
      activityLevel: activityMap[answers.activityLevel],
      nutritionApproach: nutritionMap[answers.nutritionPreference],
      sleepHours: answers.sleepHours.toString(),
      stressLevel: stressMap[answers.stressLevel],
      motivations: answers.motivation || [],
      challenges: answers.challenges || [],
      mealsPerDay: mealMap[answers.mealFrequency] || '3',
      threeMonthGoal: answers.goal,
    };
  };

  const calculateLocalResults = () => {
    const mapped = mapToSchemaValues();

    // Mifflin-St Jeor Formula
    const weight = parseFloat(mapped.weight);
    const height = parseFloat(mapped.height);
    const age = parseFloat(mapped.age);
    const s = mapped.biologicalSex === 'male' ? 5 : -161;

    const bmr = 10 * weight + 6.25 * height - 5 * age + s;

    // Activity multipliers
    const activityMultipliers: { [key: string]: number } = {
      'sedentary': 1.2,
      'lightly_active': 1.375,
      'moderately_active': 1.55,
      'very_active': 1.725,
      'extremely_active': 1.9
    };

    const tdee = bmr * activityMultipliers[mapped.activityLevel];

    // Adjust for fitness goal
    const goalAdjustments: { [key: string]: number } = {
      'lose_weight': -500,
      'build_muscle': 300,
      'maintain': 0,
      'improve_health': 0
    };

    const dailyCalories = tdee + goalAdjustments[mapped.fitnessGoal];

    // Calculate macros
    let proteinGrams = weight * 1.6;
    if (mapped.fitnessGoal === 'build_muscle') proteinGrams = weight * 2.2;
    if (mapped.fitnessGoal === 'lose_weight') proteinGrams = weight * 2.0;
    if (mapped.nutritionApproach === 'high_protein') proteinGrams = weight * 2.5;

    let fatPercentage = 0.3;
    if (mapped.nutritionApproach === 'low_carb') fatPercentage = 0.4;

    const fatGrams = (dailyCalories * fatPercentage) / 9;
    const proteinCalories = proteinGrams * 4;
    const fatCalories = fatGrams * 9;
    const carbCalories = dailyCalories - proteinCalories - fatCalories;
    const carbsGrams = Math.max(50, carbCalories / 4);

    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      dailyCalories: Math.round(dailyCalories),
      dailyProtein: Math.round(proteinGrams),
      dailyCarbs: Math.round(carbsGrams),
      dailyFat: Math.round(fatGrams),
    };
  };

  const nextStep = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Calculate and show results
      const results = calculateLocalResults();
      setCalculatedResults(results);
      setShowResults(true);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!clerkUser || !convexUser) {
      console.error('User not authenticated');
      return;
    }

    try {
      setLoading(true);

      const mapped = mapToSchemaValues();
      await onboardUser({
        clerkId: clerkUser.id,
        ...mapped,
      });

      console.log('Generating personalized plans...');
      await generateAllPlans({
        userId: convexUser._id,
      });

      console.log('Onboarding complete! Navigating to dashboard...');
      // Small delay to ensure DB registers changes before redirect
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 500);
    } catch (error: any) {
      console.error('Onboarding error:', error);
    } finally {
      // Don't set loading to false immediately to prevent button re-enabling during redirect
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const currentAnswer = answers[questions[currentStep]?.id];
  const canProceed = currentAnswer !== undefined && currentAnswer !== '' &&
    (questions[currentStep]?.type !== 'multiselect' ||
      (Array.isArray(currentAnswer) && currentAnswer.length > 0));

  const renderHeightInput = () => {
    const isFeetInches = units.height === 'ft';

    if (isFeetInches) {
      const feet = Math.floor(currentAnswer || 0);
      const inches = Math.round(((currentAnswer || 0) % 1) * 12);

      return (
        <View style={styles.heightInputContainer}>
          <View style={styles.unitSelector}>
            <TouchableOpacity
              style={[styles.unitButton, isFeetInches && styles.unitButtonActive]}
              onPress={() => handleUnitChange('height', 'ft')}
            >
              <Text style={[styles.unitButtonText, isFeetInches && styles.unitButtonTextActive]}>Feet & Inches</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitButton, !isFeetInches && styles.unitButtonActive]}
              onPress={() => handleUnitChange('height', 'cm')}
            >
              <Text style={[styles.unitButtonText, !isFeetInches && styles.unitButtonTextActive]}>Centimeters</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heightRow}>
            <View style={styles.heightInputGroup}>
              <Text style={styles.heightInputLabel}>Feet</Text>
              <TextInput
                style={styles.heightInput}
                placeholder="5"
                keyboardType="numeric"
                value={feet.toString()}
                onChangeText={(text) => {
                  const newFeet = parseInt(text) || 0;
                  const currentInches = ((currentAnswer || 0) % 1) * 12;
                  handleAnswer(newFeet + currentInches / 12);
                }}
              />
            </View>
            <View style={styles.heightInputGroup}>
              <Text style={styles.heightInputLabel}>Inches</Text>
              <TextInput
                style={styles.heightInput}
                placeholder="8"
                keyboardType="numeric"
                value={inches.toString()}
                onChangeText={(text) => {
                  const newInches = parseInt(text) || 0;
                  const currentFeet = Math.floor(currentAnswer || 0);
                  handleAnswer(currentFeet + newInches / 12);
                }}
              />
            </View>
          </View>
          {currentAnswer > 0 && (
            <Text style={styles.conversionText}>
              {Math.floor(currentAnswer)}'{Math.round(((currentAnswer % 1) * 12))}"
              ({Math.round((Math.floor(currentAnswer) * 30.48) + (((currentAnswer % 1) * 12) * 2.54))} cm)
            </Text>
          )}
        </View>
      );
    } else {
      return (
        <View style={styles.heightInputContainer}>
          <View style={styles.unitSelector}>
            <TouchableOpacity
              style={[styles.unitButton, isFeetInches && styles.unitButtonActive]}
              onPress={() => handleUnitChange('height', 'ft')}
            >
              <Text style={[styles.unitButtonText, isFeetInches && styles.unitButtonTextActive]}>Feet & Inches</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitButton, !isFeetInches && styles.unitButtonActive]}
              onPress={() => handleUnitChange('height', 'cm')}
            >
              <Text style={[styles.unitButtonText, !isFeetInches && styles.unitButtonTextActive]}>Centimeters</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="170"
            keyboardType="numeric"
            value={currentAnswer?.toString() || ''}
            onChangeText={(text) => handleAnswer(Number(text) || 0)}
          />
          {currentAnswer > 0 && (
            <Text style={styles.conversionText}>
              {currentAnswer} cm ({Math.floor(currentAnswer / 30.48)}'{Math.round(((currentAnswer / 30.48) % 1) * 12)}")
            </Text>
          )}
        </View>
      );
    }
  };

  const renderNumberWithUnits = () => {
    const isWeight = questions[currentStep].id === 'weight' || questions[currentStep].id === 'targetWeight';
    const currentUnit = isWeight ? units.weight : units.height;
    const unitOptions = questions[currentStep].units || [];

    return (
      <View style={styles.unitInputContainer}>
        <View style={styles.unitSelector}>
          {unitOptions.map((unit) => (
            <TouchableOpacity
              key={unit}
              style={[styles.unitButton, currentUnit === unit && styles.unitButtonActive]}
              onPress={() => handleUnitChange(isWeight ? 'weight' : 'height', unit)}
            >
              <Text style={[styles.unitButtonText, currentUnit === unit && styles.unitButtonTextActive]}>
                {unit}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.unitInputWrapper}>
          <TextInput
            style={[styles.input, styles.unitInput]}
            placeholder={questions[currentStep].placeholder}
            keyboardType="numeric"
            value={currentAnswer?.toString() || ''}
            onChangeText={(text) => handleAnswer(Number(text) || 0)}
          />
          <Text style={styles.unitLabel}>{currentUnit}</Text>
        </View>
        {isWeight && currentAnswer > 0 && (
          <Text style={styles.conversionText}>
            {units.weight === 'lbs'
              ? `${currentAnswer} lbs (${(Number(currentAnswer) * 0.453592).toFixed(1)} kg)`
              : `${currentAnswer} kg (${(Number(currentAnswer) / 0.453592).toFixed(1)} lbs)`
            }
          </Text>
        )}
      </View>
    );
  };

  const renderWelcomeSlide = ({ item }: { item: typeof welcomeSlides[0] }) => {
    const IconComponent = item.icon;
    return (
      <View style={[styles.welcomeSlide, { backgroundColor: item.bgColor }]}>
        <View style={styles.welcomeIconContainer}>
          <LinearGradient
            colors={item.colors}
            style={styles.welcomeIconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <IconComponent size={64} color="#FFFFFF" />
          </LinearGradient>
        </View>

        <View style={styles.welcomeTextContainer}>
          <Text style={styles.welcomeSlideTitle}>{item.title}</Text>
          <Text style={[styles.welcomeSlideSubtitle, { color: item.colors[1] }]}>
            {item.subtitle}
          </Text>
          <Text style={styles.welcomeSlideDescription}>{item.description}</Text>
        </View>
      </View>
    );
  };

  const WelcomePagination = () => (
    <View style={styles.welcomePagination}>
      {welcomeSlides.map((_, index) => {
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
        ];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 32, 8],
          extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index.toString()}
            style={[
              styles.welcomeDot,
              {
                width: dotWidth,
                opacity,
                backgroundColor: welcomeSlides[welcomeIndex].colors[1],
              },
            ]}
          />
        );
      })}
    </View>
  );

  if (showWelcome) {
    return (
      <View style={styles.welcomeContainer}>
        <FlatList
          ref={slidesRef}
          data={welcomeSlides}
          renderItem={renderWelcomeSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={viewConfig}
          scrollEventThrottle={32}
        />

        <SafeAreaView style={styles.welcomeFooter} edges={['bottom']}>
          <WelcomePagination />

          <TouchableOpacity onPress={scrollToNext} activeOpacity={0.8}>
            <LinearGradient
              colors={welcomeSlides[welcomeIndex].colors}
              style={styles.welcomeNextButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.welcomeNextButtonText}>
                {welcomeIndex === welcomeSlides.length - 1 ? 'Get Started' : 'Next'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  if (showResults && calculatedResults) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Your Personalized Plan</Text>
          <Text style={styles.resultsSubtitle}>
            Based on your responses, here's what we calculated for you
          </Text>

          <View style={styles.resultsCard}>
            <Text style={styles.resultsLabel}>Daily Calorie Target</Text>
            <Text style={styles.resultsValue}>{calculatedResults.dailyCalories} kcal</Text>
            <Text style={styles.resultsDescription}>
              {answers.fitnessGoal === 'Lose Weight' && 'Set to a 500 kcal deficit for healthy weight loss'}
              {answers.fitnessGoal === 'Build Muscle' && 'Set to a 300 kcal surplus for muscle growth'}
              {answers.fitnessGoal === 'Maintain Weight' && 'Set to maintain your current weight'}
            </Text>
          </View>

          <BlurView intensity={80} style={styles.blurredSection}>
            <View style={styles.macrosPreview}>
              <Text style={styles.macrosTitle}>Your Macro Split</Text>
              <View style={styles.macrosRow}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{calculatedResults.dailyProtein}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{calculatedResults.dailyCarbs}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{calculatedResults.dailyFat}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
              </View>
            </View>
          </BlurView>

          <Text style={styles.unlockText}>
            Review your calculated plan and continue to your dashboard
          </Text>

          <TouchableOpacity
            style={[styles.googleButton, (loading || !clerkUser) && styles.navButtonDisabled]}
            onPress={handleCompleteOnboarding}
            disabled={loading || !clerkUser}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.googleButtonText}>Continue to Dashboard</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            disabled={loading}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              {currentStep + 1} of {questions.length}
            </Text>
            <View style={styles.progressPercentage}>
              <Sparkles size={16} color="#2563eb" />
              <Text style={styles.progressPercentageText}>
                {Math.round(((currentStep + 1) / questions.length) * 100)}%
              </Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentStep + 1) / questions.length) * 100}%` }
              ]}
            />
          </View>
        </View>

        <View style={styles.questionCard}>
          <Text style={styles.questionTitle}>
            {questions[currentStep].question}
          </Text>

          {questions[currentStep].subtitle && (
            <Text style={styles.questionSubtitle}>
              {questions[currentStep].subtitle}
            </Text>
          )}

          {questions[currentStep].type === 'text' && (
            <TextInput
              style={styles.input}
              placeholder={questions[currentStep].placeholder}
              value={currentAnswer || ''}
              onChangeText={handleAnswer}
              autoFocus
            />
          )}

          {questions[currentStep].type === 'number' && (
            <TextInput
              style={styles.input}
              placeholder={questions[currentStep].placeholder}
              keyboardType="numeric"
              value={currentAnswer?.toString() || ''}
              onChangeText={(text) => handleAnswer(Number(text) || 0)}
              autoFocus
            />
          )}

          {questions[currentStep].type === 'number_with_units' && renderNumberWithUnits()}

          {questions[currentStep].type === 'height_input' && renderHeightInput()}

          {questions[currentStep].type === 'select' && (
            <View style={styles.optionsContainer}>
              {questions[currentStep].options?.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    currentAnswer === option && styles.optionButtonSelected
                  ]}
                  onPress={() => handleAnswer(option)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.optionText,
                    currentAnswer === option && styles.optionTextSelected
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {questions[currentStep].type === 'select_with_info' && (
            <View style={styles.optionsContainer}>
              {questions[currentStep].options?.map((option) => (
                <View key={option} style={styles.optionWithInfo}>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      styles.optionButtonWithInfo,
                      currentAnswer === option && styles.optionButtonSelected
                    ]}
                    onPress={() => handleAnswer(option)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.optionText,
                      currentAnswer === option && styles.optionTextSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.infoButton}
                    onPress={() => showInfo(option)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.infoButtonText}>ℹ️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {questions[currentStep].type === 'multiselect' && (
            <View style={styles.optionsContainer}>
              {questions[currentStep].options?.map((option) => {
                const isSelected = (currentAnswer || []).includes(option);
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton,
                      isSelected && styles.optionButtonSelected
                    ]}
                    onPress={() => {
                      const current = currentAnswer || [];
                      const updated = current.includes(option)
                        ? current.filter((item: string) => item !== option)
                        : [...current, option];
                      handleAnswer(updated);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.multiselectContent}>
                      <Text style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected
                      ]}>
                        {option}
                      </Text>
                      {isSelected && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.progressIndicator}>
          <Text style={styles.progressIndicatorText}>
            {currentStep < questions.length - 1
              ? `${questions.length - currentStep - 1} questions remaining`
              : 'Ready to see your results!'
            }
          </Text>
        </View>
      </ScrollView>

      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, styles.backButton, currentStep === 0 && styles.navButtonDisabled]}
          onPress={prevStep}
          disabled={currentStep === 0}
          activeOpacity={0.7}
        >
          <Text style={[styles.backButtonText, currentStep === 0 && styles.navButtonTextDisabled]}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, styles.nextButton, !canProceed && styles.navButtonDisabled]}
          onPress={nextStep}
          disabled={!canProceed}
          activeOpacity={0.7}
        >
          <Text style={[styles.nextButtonText, !canProceed && styles.navButtonTextDisabled]}>
            {currentStep === questions.length - 1 ? 'See Results' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showInfoModal} animationType="fade" transparent onRequestClose={() => setShowInfoModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{infoContent.title}</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>{infoContent.description}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowInfoModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ebf2fe',
  },
  welcomeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  welcomeSlide: {
    width: width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeIconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeIconGradient: {
    width: 128,
    height: 128,
    borderRadius: 64,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  welcomeTextContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 40,
    alignItems: 'center',
  },
  welcomeSlideTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSlideSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  welcomeSlideDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  welcomeFooter: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    paddingTop: 20,
  },
  welcomePagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 8,
  },
  welcomeDot: {
    height: 8,
    borderRadius: 4,
  },
  welcomeNextButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeNextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 100,
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#64748b',
  },
  progressPercentage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressPercentageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 6,
  },
  questionCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  questionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  questionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
    lineHeight: 20,
  },
  input: {
    width: '100%',
    height: 56,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  unitInputContainer: {
    gap: 16,
  },
  unitSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  unitButtonActive: {
    backgroundColor: '#2563eb',
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  unitButtonTextActive: {
    color: '#ffffff',
  },
  unitInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingRight: 16,
  },
  unitInput: {
    flex: 1,
    borderWidth: 0,
    paddingRight: 8,
  },
  unitLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  heightInputContainer: {
    gap: 16,
  },
  heightRow: {
    flexDirection: 'row',
    gap: 12,
  },
  heightInputGroup: {
    flex: 1,
  },
  heightInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 8,
  },
  heightInput: {
    height: 56,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  conversionText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    width: '100%',
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  optionButtonSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  optionButtonWithInfo: {
    paddingRight: 48,
  },
  optionText: {
    fontSize: 16,
    color: '#1e293b',
  },
  optionTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
  optionWithInfo: {
    position: 'relative',
  },
  infoButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -10 }],
    padding: 4,
  },
  infoButtonText: {
    fontSize: 20,
  },
  multiselectContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 20,
    color: '#2563eb',
  },
  progressIndicator: {
    alignItems: 'center',
    marginTop: 8,
  },
  progressIndicatorText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 40,
    backgroundColor: '#ebf2fe',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  backButton: {
    backgroundColor: 'transparent',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    marginLeft: 12,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonTextDisabled: {
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalClose: {
    fontSize: 24,
    color: '#1e293b',
  },
  modalDescription: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  resultsContainer: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  resultsTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  resultsSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  resultsCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  resultsLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  resultsValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  resultsDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  blurredSection: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  macrosPreview: {
    padding: 24,
  },
  macrosTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  unlockText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  googleButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  googleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
});
