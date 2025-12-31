import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getMyRecipes = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const recipes = await ctx.db
      .query("recipes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // newest first
    recipes.sort((a, b) => b.createdAt - a.createdAt);
    return recipes;
  },
});

export const createRecipe = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    servings: v.float64(),
    ingredientsJson: v.string(),
    nutritionJson: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("recipes", {
      userId: args.userId,
      name: args.name,
      servings: args.servings,
      ingredientsJson: args.ingredientsJson,
      nutritionJson: args.nutritionJson,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const deleteRecipe = mutation({
  args: { recipeId: v.id("recipes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.recipeId);
  },
});















