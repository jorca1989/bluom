import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const seedMeditationSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const sessions = [
      {
        title: "Deep Sleep Journey",
        description: "A calming meditation to help you drift into deep sleep.",
        category: "sleep",
        duration: 10,
        isPremium: false,
      },
      {
        title: "Morning Clarity",
        description: "Start your day with a clear mind and focused energy.",
        category: "morning",
        duration: 5,
        isPremium: false,
      },
      {
        title: "Anxiety Release",
        description: "Let go of tension and find your inner peace.",
        category: "anxiety",
        duration: 15,
        isPremium: true,
      },
      {
        title: "Quick Reset",
        description: "A short break to recenter yourself during a busy day.",
        category: "focus",
        duration: 3,
        isPremium: false,
      },
    ];

    for (const session of sessions) {
      const existing = await ctx.db
        .query("meditationSessions")
        .withIndex("by_category", (q) => q.eq("category", session.category))
        .filter((q) => q.eq(q.field("title"), session.title))
        .first();

      if (!existing) {
        await ctx.db.insert("meditationSessions", session);
      }
    }
  },
});









