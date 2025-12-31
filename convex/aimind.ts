import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const saveGratitude = mutation({
  args: {
    userId: v.id("users"),
    entry: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("gratitudeEntries", {
      userId: args.userId,
      entry: args.entry,
      date: args.date,
      timestamp: Date.now(),
    });
  },
});

export const getGratitudeEntries = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gratitudeEntries")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(10);
  },
});

export const saveJournal = mutation({
  args: {
    userId: v.id("users"),
    content: v.string(),
    moodTag: v.optional(v.string()),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("journalEntries", {
      userId: args.userId,
      content: args.content,
      moodTag: args.moodTag,
      date: args.date,
      timestamp: Date.now(),
    });
  },
});

export const getJournalEntries = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("journalEntries")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(5);
  },
});

export const getWellnessInsights = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wellnessInsights")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();
  },
});
