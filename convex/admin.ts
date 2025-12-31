import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { checkAdminPower } from "./functions";

/**
 * Dashboard Overview Stats
 */
export const getDashboardStats = query({
    handler: async (ctx) => {
        await checkAdminPower(ctx);

        const users = await ctx.db.query("users").collect();
        const recipes = await ctx.db.query("publicRecipes").collect();
        const workouts = await ctx.db.query("exerciseEntries").collect(); // Using historical entries for simple metric
        const transactions = await ctx.db.query("transactions").collect();

        // Group users by premium vs free
        const premiumUsers = users.filter(u => u.isPremium).length;

        // Calculate simple revenue
        const totalRevenue = transactions
            .filter(t => t.status === "succeeded")
            .reduce((acc, t) => acc + t.amount, 0);

        // Mock analytics for now (in real app, use timestamps)
        const activeToday = Math.floor(users.length * 0.4);

        return {
            totalUsers: users.length,
            premiumUsers,
            totalRecipes: recipes.length,
            totalWorkouts: 100, // Hardcoded or query exercises database if separate
            totalRevenue,
            dau: activeToday,
            mau: Math.floor(users.length * 0.8),
            activationRate: 65, // Example 65%
        };
    },
});

/**
 * CRM: Fetch Users
 */
export const getUsers = query({
    args: {
        search: v.optional(v.string()),
        role: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);

        let users = await ctx.db.query("users").collect();

        if (args.search) {
            const s = args.search.toLowerCase();
            users = users.filter(u =>
                u.name.toLowerCase().includes(s) ||
                u.email.toLowerCase().includes(s)
            );
        }

        if (args.role) {
            users = users.filter(u => u.role === args.role);
        }

        return users.sort((a, b) => b.createdAt - a.createdAt);
    }
});

/**
 * CRM: Update User Role
 */
export const updateUserRole = mutation({
    args: {
        userId: v.id("users"),
        role: v.union(v.literal("user"), v.literal("admin"), v.literal("super_admin")),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);

        await ctx.db.patch(args.userId, {
            role: args.role,
            updatedAt: Date.now(),
        });

        return { success: true };
    }
});

/**
 * CMS: Blog Articles CRUD
 */
export const getArticles = query({
    handler: async (ctx) => {
        await checkAdminPower(ctx);
        return await ctx.db.query("blogArticles").order("desc").collect();
    }
});

export const createArticle = mutation({
    args: {
        title: v.string(),
        slug: v.string(),
        content: v.string(),
        status: v.union(v.literal("DRAFT"), v.literal("PENDING"), v.literal("PUBLISHED")),
        category: v.string(),
        featuredImage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const admin = await checkAdminPower(ctx);

        const articleId = await ctx.db.insert("blogArticles", {
            ...args,
            authorId: admin.subject as any, // Clerk ID handled as user ID in ctx.auth
            tags: [],
            updatedAt: Date.now(),
            createdAt: Date.now(),
        });

        return articleId;
    }
});
