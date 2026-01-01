import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase().trim();

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Store or update user from Clerk authentication
 * Called when user signs up or signs in
 */
export const storeUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      return existingUser._id;
    }

    const isOwnerAdmin = !!ADMIN_EMAIL && args.email.toLowerCase() === ADMIN_EMAIL;
    const initialResetDate = todayIsoDate();

    // Create new user with default values
    // User will complete onboarding to fill in biometrics and calculate targets
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,

      // Placeholder values - will be set during onboarding
      age: 0,
      biologicalSex: "male",
      weight: 0,
      height: 0,
      fitnessGoal: "maintain",
      activityLevel: "moderately_active",
      fitnessExperience: "beginner",
      workoutPreference: "mixed",
      weeklyWorkoutTime: 0,
      nutritionApproach: "balanced",
      mealsPerDay: 3,
      sleepHours: 7,
      stressLevel: "moderate",
      motivations: [],
      challenges: [],
      threeMonthGoal: "",

      // These will be calculated during onboarding
      dailyCalories: 2000,
      dailyProtein: 150,
      dailyCarbs: 200,
      dailyFat: 65,

      isPremium: false,
      subscriptionStatus: "free",
      role: isOwnerAdmin ? "admin" : "user",
      isAdmin: isOwnerAdmin,
      dailyGamePlays: 0,
      dailyMeditationPlays: 0,
      dailyMealLogs: 0,
      lastResetDate: initialResetDate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

/**
 * Get user by Clerk ID
 */
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    return user;
  },
});

/**
 * Get user by ID
 */
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Update user profile
 */
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    updates: v.object({
      name: v.optional(v.string()),
      weight: v.optional(v.float64()),
      height: v.optional(v.float64()),
      targetWeight: v.optional(v.float64()),
      fitnessGoal: v.optional(
        v.union(
          v.literal("lose_weight"),
          v.literal("build_muscle"),
          v.literal("maintain"),
          v.literal("improve_health")
        )
      ),
      activityLevel: v.optional(
        v.union(
          v.literal("sedentary"),
          v.literal("lightly_active"),
          v.literal("moderately_active"),
          v.literal("very_active"),
          v.literal("extremely_active")
        )
      ),
      fitnessExperience: v.optional(
        v.union(
          v.literal("beginner"),
          v.literal("intermediate"),
          v.literal("advanced")
        )
      ),
      workoutPreference: v.optional(
        v.union(
          v.literal("strength"),
          v.literal("cardio"),
          v.literal("hiit"),
          v.literal("yoga"),
          v.literal("mixed")
        )
      ),
      weeklyWorkoutTime: v.optional(v.float64()),
      nutritionApproach: v.optional(
        v.union(
          v.literal("balanced"),
          v.literal("high_protein"),
          v.literal("low_carb"),
          v.literal("plant_based"),
          v.literal("flexible")
        )
      ),
      mealsPerDay: v.optional(v.float64()),
      sleepHours: v.optional(v.float64()),
      stressLevel: v.optional(
        v.union(
          v.literal("low"),
          v.literal("moderate"),
          v.literal("high"),
          v.literal("very_high")
        )
      ),
      dailyCalories: v.optional(v.float64()),
      dailyProtein: v.optional(v.float64()),
      dailyCarbs: v.optional(v.float64()),
      dailyFat: v.optional(v.float64()),
      isPremium: v.optional(v.boolean()),
      premiumExpiry: v.optional(v.float64()),
      stripeCustomerId: v.optional(v.string()),
      stripeSubscriptionId: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      ...args.updates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal-only: set premium status from Stripe webhooks.
 */
export const setPremiumStatus = internalMutation({
  args: {
    userId: v.id("users"),
    isPremium: v.boolean(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      isPremium: args.isPremium,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId ?? undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal-only: update subscription status from RevenueCat webhooks
 */
export const updateSubscription = internalMutation({
  args: {
    userId: v.string(), // RevenueCat passes this as string, usually matches clerkId, but we might need to lookup user first if rcUserId != clerkId
    status: v.string(),
    endsOn: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // args.userId from RevenueCat logic is expected to be the Clerk ID (app_user_id)
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
      .first();

    if (!user) {
      console.error(`RevenueCat webhook: User not found for clerkId ${args.userId}`);
      return;
    }

    await ctx.db.patch(user._id, {
      subscriptionStatus: args.status,
      endsOn: args.endsOn,
      isPremium: args.status === "pro", // Keep isPremium in sync for backward compatibility
      updatedAt: Date.now(),
    });
  },
});

/**
 * Check if user has completed onboarding
 */
export const hasCompletedOnboarding = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return false;

    // Check if user has filled in essential onboarding data
    return user.age > 0 && user.weight > 0 && user.height > 0;
  },
});
/**
 * Reset user onboarding data
 */
export const resetOnboarding = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      age: 0,
      weight: 0,
      height: 0,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Link a partner by email for shared features (Todo/Grocery)
 */
export const linkPartner = mutation({
  args: {
    userId: v.id("users"),
    partnerEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const partner = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.partnerEmail.toLowerCase().trim()))
      .first();

    if (!partner) {
      throw new Error("User with this email not found. Tell them to join Bluom first!");
    }

    if (partner._id === args.userId) {
      throw new Error("You cannot link with yourself.");
    }

    // Bidirectional link
    await ctx.db.patch(args.userId, { partnerId: partner._id, updatedAt: Date.now() });
    await ctx.db.patch(partner._id, { partnerId: args.userId, updatedAt: Date.now() });

    return { partnerName: partner.name };
  },
});

/**
 * Unlink partner
 */
export const unlinkPartner = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    if (user.partnerId) {
      await ctx.db.patch(user.partnerId, { partnerId: undefined, updatedAt: Date.now() });
    }
    await ctx.db.patch(args.userId, { partnerId: undefined, updatedAt: Date.now() });
  },
});
