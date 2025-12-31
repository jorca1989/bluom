import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { checkAdminPower } from "./functions";

// --- Admin Mutations ---

export const createExercise = mutation({
    args: {
        name: v.string(),
        category: v.string(),
        type: v.union(v.literal("strength"), v.literal("cardio"), v.literal("hiit"), v.literal("yoga")),
        met: v.float64(),
        caloriesPerMinute: v.optional(v.float64()),
        muscleGroups: v.array(v.string()),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        const exerciseId = await ctx.db.insert("exerciseLibrary", {
            ...args,
            nameLower: args.name.toLowerCase(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        return exerciseId;
    },
});

export const updateExercise = mutation({
    args: {
        id: v.id("exerciseLibrary"),
        updates: v.object({
            name: v.optional(v.string()),
            category: v.optional(v.string()),
            type: v.optional(v.union(v.literal("strength"), v.literal("cardio"), v.literal("hiit"), v.literal("yoga"))),
            met: v.optional(v.float64()),
            caloriesPerMinute: v.optional(v.float64()),
            muscleGroups: v.optional(v.array(v.string())),
            description: v.optional(v.string()),
        }),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        if (args.updates.name) {
            (args.updates as any).nameLower = args.updates.name.toLowerCase();
        }
        await ctx.db.patch(args.id, {
            ...args.updates,
            updatedAt: Date.now(),
        });
    },
});

export const deleteExercise = mutation({
    args: { id: v.id("exerciseLibrary") },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        await ctx.db.delete(args.id);
    },
});

export const bulkInsertExercises = mutation({
    args: {
        exercises: v.array(
            v.object({
                name: v.string(),
                category: v.string(),
                type: v.union(v.literal("strength"), v.literal("cardio"), v.literal("hiit"), v.literal("yoga")),
                met: v.float64(),
                caloriesPerMinute: v.optional(v.float64()),
                muscleGroups: v.array(v.string()),
            })
        ),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        for (const ex of args.exercises) {
            await ctx.db.insert("exerciseLibrary", {
                ...ex,
                nameLower: ex.name.toLowerCase(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }
    },
});

export const seedExerciseLibrary = mutation({
    handler: async (ctx) => {
        await checkAdminPower(ctx);
        const existing = await ctx.db.query("exerciseLibrary").first();
        if (existing) return { success: false, message: "Library already has data" };

        const initial = [
            { name: "Push-ups", category: "Strength", type: "strength", met: 7.0, caloriesPerMinute: 7, muscleGroups: ["Chest", "Triceps", "Shoulders"] },
            { name: "Bodyweight Squats", category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 6, muscleGroups: ["Quads", "Glutes", "Core"] },
            { name: "Deadlift", category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Back", "Glutes", "Hamstrings"] },
            { name: "Bench Press", category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Chest", "Triceps", "Shoulders"] },
            { name: "Running", category: "Cardio", type: "cardio", met: 10.0, caloriesPerMinute: 11, muscleGroups: ["Legs", "Cardio"] },
            { name: "Cycling", category: "Cardio", type: "cardio", met: 8.0, caloriesPerMinute: 9, muscleGroups: ["Legs", "Cardio"] },
            { name: "Rowing Machine", category: "Cardio", type: "cardio", met: 9.0, caloriesPerMinute: 10, muscleGroups: ["Back", "Legs", "Cardio"] },
            { name: "Jump Rope", category: "Cardio", type: "cardio", met: 12.0, caloriesPerMinute: 12, muscleGroups: ["Full body"] },
            { name: "HIIT Circuit", category: "HIIT", type: "hiit", met: 13.0, caloriesPerMinute: 13, muscleGroups: ["Full body"] },
            { name: "Yoga Flow", category: "Flexibility", type: "yoga", met: 3.0, caloriesPerMinute: 4, muscleGroups: ["Mobility", "Core"] }
        ];

        for (const ex of initial) {
            await ctx.db.insert("exerciseLibrary", {
                ...ex,
                nameLower: ex.name.toLowerCase(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
            } as any);
        }
        return { success: true };
    },
});

// --- Public Queries ---

export const list = query({
    args: {
        search: v.optional(v.string()),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let exercises = await ctx.db.query("exerciseLibrary").collect();

        if (args.category) {
            exercises = exercises.filter((e) => e.category === args.category);
        }

        if (args.search) {
            const s = args.search.toLowerCase();
            exercises = exercises.filter((e) => e.nameLower.includes(s));
        }

        return exercises.sort((a, b) => a.name.localeCompare(b.name));
    },
});

export const getByNames = query({
    args: { names: v.array(v.string()) },
    handler: async (ctx, args) => {
        const namesLower = args.names.map(n => n.toLowerCase());
        return await ctx.db
            .query("exerciseLibrary")
            .filter((q) => q.or(...namesLower.map(n => q.eq(q.field("nameLower"), n))))
            .collect();
    }
});
