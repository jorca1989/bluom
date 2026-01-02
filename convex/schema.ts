import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - Core profile and calculated targets
  users: defineTable({
    // Clerk Integration
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),

    // Biometrics (v.float64 for precision)
    age: v.float64(),
    biologicalSex: v.union(v.literal("male"), v.literal("female")),
    weight: v.float64(), // in kg
    height: v.float64(), // in cm
    targetWeight: v.optional(v.float64()), // in kg

    // Activity & Goals
    fitnessGoal: v.union(
      v.literal("lose_weight"),
      v.literal("build_muscle"),
      v.literal("maintain"),
      v.literal("improve_health")
    ),
    activityLevel: v.union(
      v.literal("sedentary"),
      v.literal("lightly_active"),
      v.literal("moderately_active"),
      v.literal("very_active"),
      v.literal("extremely_active")
    ),
    fitnessExperience: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced")
    ),
    workoutPreference: v.union(
      v.literal("strength"),
      v.literal("cardio"),
      v.literal("hiit"),
      v.literal("yoga"),
      v.literal("mixed")
    ),
    weeklyWorkoutTime: v.float64(), // hours per week

    // Nutrition Preferences
    nutritionApproach: v.union(
      v.literal("balanced"),
      v.literal("high_protein"),
      v.literal("low_carb"),
      v.literal("plant_based"),
      v.literal("flexible")
    ),
    mealsPerDay: v.float64(),

    // Wellness Data
    sleepHours: v.float64(),
    stressLevel: v.union(
      v.literal("low"),
      v.literal("moderate"),
      v.literal("high"),
      v.literal("very_high")
    ),
    motivations: v.array(v.string()),
    challenges: v.array(v.string()),
    threeMonthGoal: v.string(),

    // Calculated Daily Targets (Mifflin-St Jeor)
    dailyCalories: v.float64(),
    dailyProtein: v.float64(), // in grams
    dailyCarbs: v.float64(), // in grams
    dailyFat: v.float64(), // in grams

    // Premium Status
    isPremium: v.boolean(),
    premiumExpiry: v.optional(v.float64()), // timestamp
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()), // "pro" or "free"
    endsOn: v.optional(v.number()), // Unix timestamp for expiration
    rcUserId: v.optional(v.string()), // RevenueCat App User ID

    // Role-based access control
    role: v.optional(v.union(v.literal("user"), v.literal("admin"), v.literal("super_admin"))),

    // Owner/Admin bypass + daily usage counters (free-tier gating)
    isAdmin: v.optional(v.boolean()),
    dailyGamePlays: v.optional(v.number()),
    dailyMeditationPlays: v.optional(v.number()),
    dailyMealLogs: v.optional(v.number()),
    dailyAiMessages: v.optional(v.number()),
    lastResetDate: v.optional(v.string()), // "YYYY-MM-DD"

    partnerId: v.optional(v.id("users")), // For shared Todo/Grocery lists

    // Metadata
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // --- Admin & CMS Tables ---

  blogArticles: defineTable({
    title: v.string(),
    slug: v.string(),
    content: v.string(), // HTML/Markdown
    featuredImage: v.optional(v.string()),
    authorId: v.id("users"),
    status: v.union(v.literal("DRAFT"), v.literal("PENDING"), v.literal("PUBLISHED")),
    category: v.string(),
    tags: v.array(v.string()),
    scheduledAt: v.optional(v.float64()),
    updatedAt: v.float64(),
    createdAt: v.float64(),
  }).index("by_status", ["status"]).index("by_slug", ["slug"]),

  faqs: defineTable({
    question: v.string(),
    answer: v.string(),
    category: v.string(),
    order: v.float64(),
    createdAt: v.float64(),
  }).index("by_category", ["category"]),

  legalDocuments: defineTable({
    type: v.union(v.literal("terms"), v.literal("privacy")),
    version: v.string(),
    content: v.string(),
    isActive: v.boolean(),
    createdAt: v.float64(),
  }).index("by_type_active", ["type", "isActive"]),

  pricingPlans: defineTable({
    name: v.string(),
    description: v.string(),
    priceMonthly: v.float64(),
    priceYearly: v.float64(),
    features: v.array(v.string()),
    isActive: v.boolean(),
    stripeProductId: v.optional(v.string()),
  }),

  discountCodes: defineTable({
    code: v.string(), // e.g. BLOOM20
    percentOff: v.optional(v.float64()),
    amountOff: v.optional(v.float64()),
    redemptionLimit: v.optional(v.float64()),
    currentRedemptions: v.float64(),
    expiryDate: v.optional(v.float64()),
    isActive: v.boolean(),
  }).index("by_code", ["code"]),

  transactions: defineTable({
    userId: v.id("users"),
    amount: v.float64(),
    currency: v.string(),
    status: v.union(v.literal("succeeded"), v.literal("pending"), v.literal("failed")),
    provider: v.string(), // stripe, apple, google
    providerTransactionId: v.string(),
    createdAt: v.float64(),
  }).index("by_user", ["userId"]),

  // Food Entries - 4-slot system (5 for premium)
  foodEntries: defineTable({
    userId: v.id("users"),

    // Food Details
    foodId: v.optional(v.string()), // Reference to food database
    foodName: v.string(),

    // Macros (v.float64 for precision)
    calories: v.float64(),
    protein: v.float64(),
    carbs: v.float64(),
    fat: v.float64(),
    servingSize: v.string(),

    // Meal Classification
    mealType: v.union(
      v.literal("breakfast"),
      v.literal("lunch"),
      v.literal("dinner"),
      v.literal("snack"),
      v.literal("premium_slot") // 5th slot for premium users
    ),

    // Date tracking
    date: v.string(), // ISO date string (YYYY-MM-DD)
    timestamp: v.float64(),

    // Metadata
    createdAt: v.float64(),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_user_and_meal_type", ["userId", "mealType", "date"]),

  // Foods catalog - user-created foods/ingredients (Fuel screen)
  foods: defineTable({
    userId: v.id("users"),
    name: v.string(),
    nameLower: v.string(),
    description: v.optional(v.string()),
    brand: v.optional(v.string()),
    // External food support (FatSecret/USDA) - persisted as user foods
    source: v.optional(v.string()), // 'custom' | 'fatsecret' | 'usda'
    externalId: v.optional(v.string()), // provider id
    barcode: v.optional(v.string()),
    servingSize: v.string(),
    calories: v.float64(),
    protein: v.float64(),
    carbs: v.float64(),
    fat: v.float64(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_nameLower", ["userId", "nameLower"])
    .index("by_user_and_externalId", ["userId", "externalId"]),

  // Shopping List - shared grocery list per user (syncs across devices)
  shoppingList: defineTable({
    userId: v.id("users"),
    name: v.string(),
    nameLower: v.string(),
    quantity: v.union(v.float64(), v.string()),
    category: v.union(
      v.literal("Produce"),
      v.literal("Dairy"),
      v.literal("Meat"),
      v.literal("Seafood"),
      v.literal("Bakery"),
      v.literal("Pantry"),
      v.literal("Frozen"),
      v.literal("Beverages"),
      v.literal("Snacks"),
      v.literal("Household"),
      v.literal("Personal Care"),
      v.literal("Other")
    ),
    completed: v.boolean(),
    recipeId: v.optional(v.id("publicRecipes")),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_nameLower", ["userId", "nameLower"])
    .index("by_user_and_completed", ["userId", "completed"]),

  // Exercise Entries - MET-based tracking
  exerciseEntries: defineTable({
    userId: v.id("users"),

    // Exercise Details
    exerciseName: v.string(),
    exerciseType: v.union(
      v.literal("strength"),
      v.literal("cardio"),
      v.literal("hiit"),
      v.literal("yoga")
    ),

    // Duration & Intensity
    duration: v.float64(), // in minutes
    met: v.float64(), // Metabolic Equivalent of Task
    caloriesBurned: v.float64(), // Calculated: MET * weight_kg * duration_hrs

    // Strength Training Specifics
    sets: v.optional(v.float64()),
    reps: v.optional(v.float64()),
    weight: v.optional(v.float64()), // in kg

    // Cardio Specifics
    distance: v.optional(v.float64()), // in km
    pace: v.optional(v.float64()), // in min/km

    // Date tracking
    date: v.string(), // ISO date string (YYYY-MM-DD)
    timestamp: v.float64(),

    // Metadata
    createdAt: v.float64(),
  })
    .index("by_user_and_date", ["userId", "date"])
    .index("by_user_and_type", ["userId", "exerciseType"]),

  // Steps Entries - manual step logging (Move screen)
  stepsEntries: defineTable({
    userId: v.id("users"),
    steps: v.float64(),
    caloriesBurned: v.float64(),
    date: v.string(), // YYYY-MM-DD
    timestamp: v.float64(),
    createdAt: v.float64(),
  }).index("by_user_and_date", ["userId", "date"]),

  // Recipes - user-created recipes (Fuel screen)
  recipes: defineTable({
    userId: v.id("users"),
    name: v.string(),
    servings: v.float64(),
    ingredientsJson: v.string(),
    nutritionJson: v.string(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_user", ["userId"]),

  // Public recipes - admin uploaded recipes available to all users (Browse Recipes)
  publicRecipes: defineTable({
    title: v.string(),
    titleLower: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    cookTimeMinutes: v.optional(v.float64()),
    servings: v.float64(),
    calories: v.float64(),
    protein: v.float64(),
    carbs: v.float64(),
    fat: v.float64(),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    isPremium: v.optional(v.boolean()),
    ingredients: v.optional(v.array(v.string())),
    instructions: v.optional(v.array(v.string())),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_titleLower", ["titleLower"])
    .index("by_category", ["category"]),

  // Daily stats (Fuel water logging, etc.)
  dailyStats: defineTable({
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD
    waterOz: v.float64(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_user_and_date", ["userId", "date"])
    .index("by_user", ["userId"]),

  // Habits - Streak tracking
  habits: defineTable({
    userId: v.id("users"),

    // Habit Details
    name: v.string(),
    icon: v.string(), // Emoji or icon name
    category: v.union(
      v.literal("health"),
      v.literal("fitness"),
      v.literal("mindfulness"),
      v.literal("social"),
      v.literal("learning"),
      v.literal("physical"),
      v.literal("mental"),
      v.literal("routine")
    ),

    // Tracking
    streak: v.float64(),
    longestStreak: v.float64(),
    completedToday: v.boolean(),
    lastCompletedDate: v.optional(v.string()), // ISO date string

    // Schedule
    targetDaysPerWeek: v.float64(),
    reminderTime: v.optional(v.string()), // HH:MM format

    // Metadata
    isActive: v.boolean(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_category", ["userId", "category"]),

  // Mood Logs - 5-scale tracking
  moodLogs: defineTable({
    userId: v.id("users"),

    // Mood Data
    mood: v.union(
      v.literal(1),
      v.literal(2),
      v.literal(3),
      v.literal(4),
      v.literal(5)
    ), // 1 = Terrible, 5 = Excellent
    moodEmoji: v.string(), // 😢 😟 😐 🙂 😄

    // Context
    note: v.optional(v.string()),
    tags: v.optional(v.array(v.string())), // e.g., ["stressed", "tired", "productive"]

    // Date tracking
    date: v.string(), // ISO date string (YYYY-MM-DD)
    timestamp: v.float64(),
  })
    .index("by_user_and_date", ["userId", "date"])
    .index("by_user", ["userId"]),

  // Sleep Logs - Hours and quality
  sleepLogs: defineTable({
    userId: v.id("users"),

    // Sleep Data
    hours: v.float64(),
    quality: v.float64(), // 0-100 percentage

    // Timing
    bedTime: v.optional(v.string()), // HH:MM format
    wakeTime: v.optional(v.string()), // HH:MM format

    // Context
    note: v.optional(v.string()),
    factors: v.optional(v.array(v.string())), // e.g., ["caffeine", "exercise", "stress"]

    // Date tracking
    date: v.string(), // ISO date string (YYYY-MM-DD)
    timestamp: v.float64(),
  })
    .index("by_user_and_date", ["userId", "date"])
    .index("by_user", ["userId"]),

  // Games Progress - Free tier: 2 games/day
  gamesProgress: defineTable({
    userId: v.id("users"),
    gameId: v.string(),
    gameName: v.string(),
    highScore: v.float64(),
    timesPlayed: v.float64(),
    lastPlayedDate: v.string(), // ISO date string
    playsToday: v.float64(),
    lastResetDate: v.string(), // ISO date string for daily reset
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_user_and_game", ["userId", "gameId"])
    .index("by_user", ["userId"]),

  // Garden State - Mind World progression
  mindGardenState: defineTable({
    userId: v.id("users"),
    xp: v.float64(),
    level: v.float64(),
    tokens: v.float64(),
    meditationStreak: v.float64(),
    lastMeditationDate: v.optional(v.string()),
    updatedAt: v.float64(),
  }).index("by_user", ["userId"]),

  // Quests - Daily and Weekly challenges
  quests: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.string(),
    type: v.union(v.literal("daily"), v.literal("weekly")),
    requirementType: v.string(), // 'meditation', 'water', 'workout', etc.
    requirementValue: v.float64(),
    currentValue: v.float64(),
    completed: v.boolean(),
    xpReward: v.float64(),
    tokenReward: v.float64(),
    date: v.string(), // YYYY-MM-DD for daily, YYYY-WW for weekly
    createdAt: v.float64(),
  })
    .index("by_user_and_date", ["userId", "date"])
    .index("by_user_type_date", ["userId", "type", "date"]),

  // Achievements - User milestones
  achievements: defineTable({
    userId: v.id("users"),
    badgeId: v.string(),
    title: v.string(),
    description: v.string(),
    icon: v.string(),
    unlockedAt: v.float64(),
  }).index("by_user", ["userId"]),

  // Meditation Sessions - Predefined library
  meditationSessions: defineTable({
    title: v.string(),
    category: v.string(),
    duration: v.float64(), // minutes
    description: v.string(),
    audioUrl: v.optional(v.string()),
    isPremium: v.boolean(),
  }).index("by_category", ["category"]),

  // Meditation Logs - User history
  meditationLogs: defineTable({
    userId: v.id("users"),
    sessionId: v.optional(v.id("meditationSessions")),
    title: v.string(),
    durationMinutes: v.float64(),
    date: v.string(), // YYYY-MM-DD
    timestamp: v.float64(),
  }).index("by_user_and_date", ["userId", "date"]),

  // Nutrition Plans - Generated from onboarding
  nutritionPlans: defineTable({
    userId: v.id("users"),

    // Plan Details
    name: v.string(),
    calorieTarget: v.float64(),
    proteinTarget: v.float64(),
    carbsTarget: v.float64(),
    fatTarget: v.float64(),

    // Meal Templates
    mealTemplates: v.array(
      v.object({
        mealType: v.string(),
        calories: v.float64(),
        protein: v.float64(),
        carbs: v.float64(),
        fat: v.float64(),
        suggestions: v.array(v.string()),
      })
    ),

    // Metadata
    isActive: v.boolean(),
    createdAt: v.float64(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"]),

  // Fitness Plans - Workout split based on experience
  fitnessPlans: defineTable({
    userId: v.id("users"),

    // Plan Details
    name: v.string(),
    workoutSplit: v.string(), // e.g., "Push/Pull/Legs", "Upper/Lower"
    daysPerWeek: v.float64(),

    // Workout Templates
    workouts: v.array(
      v.object({
        day: v.string(),
        focus: v.string(),
        exercises: v.array(
          v.object({
            name: v.string(),
            sets: v.float64(),
            reps: v.float64(),
            rest: v.float64(), // seconds
          })
        ),
        estimatedDuration: v.float64(), // minutes
      })
    ),

    // Metadata
    isActive: v.boolean(),
    createdAt: v.float64(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"]),

  // Wellness Plans - Habits, sleep, meditation
  wellnessPlans: defineTable({
    userId: v.id("users"),

    // Plan Details
    name: v.string(),

    // Recommendations
    sleepRecommendation: v.object({
      targetHours: v.float64(),
      bedTimeWindow: v.string(), // e.g., "10:00 PM - 11:00 PM"
      tips: v.array(v.string()),
    }),

    meditationRecommendation: v.object({
      frequencyPerWeek: v.float64(),
      sessionDuration: v.float64(), // minutes
      style: v.string(), // e.g., "mindfulness", "guided", "breathing"
    }),

    recommendedHabits: v.array(
      v.object({
        name: v.string(),
        icon: v.string(),
        category: v.string(),
        frequency: v.string(), // e.g., "daily", "3x per week"
      })
    ),

    // Metadata
    isActive: v.boolean(),
    createdAt: v.float64(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"]),

  // Gratitude Entries
  gratitudeEntries: defineTable({
    userId: v.id("users"),
    entry: v.string(),
    date: v.string(), // YYYY-MM-DD
    timestamp: v.float64(),
  })
    .index("by_user_and_date", ["userId", "date"])
    .index("by_user", ["userId"]),

  // Journal Entries
  journalEntries: defineTable({
    userId: v.id("users"),
    content: v.string(),
    moodTag: v.optional(v.string()),
    date: v.string(), // YYYY-MM-DD
    timestamp: v.float64(),
  })
    .index("by_user_and_date", ["userId", "date"])
    .index("by_user", ["userId"]),

  // Wellness Insights
  wellnessInsights: defineTable({
    userId: v.id("users"),
    calmnessScore: v.float64(),
    avgSleep: v.float64(),
    moodStability: v.float64(),
    meditationCount: v.float64(),
    gratitudeCount: v.float64(),
    journalCount: v.float64(),
    recommendations: v.array(
      v.object({
        message: v.string(),
        action: v.string(),
      })
    ),
    date: v.string(), // YYYY-MM-DD
    timestamp: v.float64(),
  })
    .index("by_user_and_date", ["userId", "date"])
    .index("by_user", ["userId"]),

  // --- NEW: Global Content Libraries ---

  // Global exercise library for logging (Move tab)
  exerciseLibrary: defineTable({
    name: v.string(),
    nameLower: v.string(),
    category: v.string(), // Strength, Cardio, etc.
    type: v.union(v.literal("strength"), v.literal("cardio"), v.literal("hiit"), v.literal("yoga")),
    met: v.float64(),
    caloriesPerMinute: v.optional(v.float64()),
    muscleGroups: v.array(v.string()),
    description: v.optional(v.string()),
    updatedAt: v.float64(),
    createdAt: v.float64(),
  })
    .index("by_nameLower", ["nameLower"])
    .index("by_category", ["category"]),

  // Global video workout routines
  videoWorkouts: defineTable({
    title: v.string(),
    titleLower: v.string(),
    description: v.string(),
    thumbnail: v.string(),
    videoUrl: v.optional(v.string()),
    duration: v.float64(), // minutes
    calories: v.float64(),
    difficulty: v.union(v.literal("Beginner"), v.literal("Intermediate"), v.literal("Advanced")),
    category: v.string(),
    equipment: v.array(v.string()),
    rating: v.float64(),
    reviews: v.float64(),
    instructor: v.string(),
    isPremium: v.boolean(),
    exercises: v.array(
      v.object({
        name: v.string(),
        duration: v.float64(), // seconds
        reps: v.optional(v.float64()),
        sets: v.optional(v.float64()),
        description: v.string(),
      })
    ),
    updatedAt: v.float64(),
    createdAt: v.float64(),
  })
    .index("by_titleLower", ["titleLower"])
    .index("by_category", ["category"]),

  // --- Reset Modules (STOPPR / Sugarcut style) ---
  sugarLogs: defineTable({
    userId: v.id("users"),
    date: v.string(), // "YYYY-MM-DD"
    isSugarFree: v.boolean(),
    mood: v.optional(v.string()), // "happy", "struggling", etc.
    notes: v.optional(v.string()),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  }).index("by_user_date", ["userId", "date"]).index("by_user", ["userId"]),

  challenges: defineTable({
    userId: v.id("users"),
    type: v.string(), // "90-day-reset" | "120-day-reset" etc
    startDate: v.number(), // timestamp ms
    currentStreak: v.number(),
    updatedAt: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]).index("by_user_type", ["userId", "type"]),

  // Requested by spec: support_tickets (fields: userEmail, category, message, timestamp)
  support_tickets: defineTable({
    userId: v.id("users"),
    userEmail: v.string(),
    category: v.union(v.literal("bug"), v.literal("feedback")),
    message: v.string(),
    timestamp: v.number(),
  }).index("by_user", ["userId"]),

  // Requested by spec: todo table (shared family lists supported via partnerId)
  todo: defineTable({
    userId: v.id("users"),
    text: v.string(),
    category: v.union(v.literal("Family"), v.literal("Work"), v.literal("Personal"), v.literal("Grocery")),
    completed: v.boolean(),
    partnerId: v.optional(v.id("users")),
    createdAt: v.number(),
  }).index("by_user", ["userId"]).index("by_user_category", ["userId", "category"]),

  // Requested by spec: fasting_logs
  fasting_logs: defineTable({
    userId: v.id("users"),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    protocol: v.string(), // "16:8", "18:6", "20:4"
    isActive: v.boolean(),
  }).index("by_user", ["userId"]).index("by_user_active", ["userId", "isActive"]),

  cycleLogs: defineTable({
    userId: v.id("users"),
    date: v.string(), // "YYYY-MM-DD"
    symptoms: v.array(v.string()),
    flow: v.optional(v.string()),
    ovulationPredicted: v.optional(v.boolean()),
  }).index("by_user_date", ["userId", "date"]),

  vitalityLogs: defineTable({
    userId: v.id("users"),
    date: v.string(), // "YYYY-MM-DD"
    mood: v.number(),
    stress: v.string(),
    strength: v.number(),
    sleepQuality: v.number(),
    kegelCompleted: v.optional(v.boolean()),
  }).index("by_user_date", ["userId", "date"]),
});
