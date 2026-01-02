import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedExercises = mutation({
  handler: async (ctx) => {
    // Check if exercises already exist
    const existing = await ctx.db.query("exerciseLibrary").first();
    if (existing) {
      return { success: false, message: "Exercises already seeded" };
    }

    const exercises = [
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

    for (const exercise of exercises) {
      await ctx.db.insert("exerciseLibrary", {
        ...exercise,
        nameLower: exercise.name.toLowerCase(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        type: exercise.type as "strength" | "cardio" | "hiit" | "yoga",
      });
    }

    return { success: true, count: exercises.length };
  },
});
