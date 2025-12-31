/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as achievements from "../achievements.js";
import type * as admin from "../admin.js";
import type * as ai from "../ai.js";
import type * as aimind from "../aimind.js";
import type * as daily from "../daily.js";
import type * as exercise from "../exercise.js";
import type * as exercises from "../exercises.js";
import type * as externalFoods from "../externalFoods.js";
import type * as food from "../food.js";
import type * as foodCatalog from "../foodCatalog.js";
import type * as functions from "../functions.js";
import type * as habits from "../habits.js";
import type * as http from "../http.js";
import type * as meditation from "../meditation.js";
import type * as mindworld from "../mindworld.js";
import type * as onboarding from "../onboarding.js";
import type * as permissions from "../permissions.js";
import type * as plans from "../plans.js";
import type * as publicRecipes from "../publicRecipes.js";
import type * as questProgress from "../questProgress.js";
import type * as quests from "../quests.js";
import type * as recipes from "../recipes.js";
import type * as revenuecat from "../revenuecat.js";
import type * as seed from "../seed.js";
import type * as shoppingList from "../shoppingList.js";
import type * as steps from "../steps.js";
import type * as stripe from "../stripe.js";
import type * as stripe_priceMaps from "../stripe/priceMaps.js";
import type * as sugar from "../sugar.js";
import type * as users from "../users.js";
import type * as videoWorkouts from "../videoWorkouts.js";
import type * as wellness from "../wellness.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  achievements: typeof achievements;
  admin: typeof admin;
  ai: typeof ai;
  aimind: typeof aimind;
  daily: typeof daily;
  exercise: typeof exercise;
  exercises: typeof exercises;
  externalFoods: typeof externalFoods;
  food: typeof food;
  foodCatalog: typeof foodCatalog;
  functions: typeof functions;
  habits: typeof habits;
  http: typeof http;
  meditation: typeof meditation;
  mindworld: typeof mindworld;
  onboarding: typeof onboarding;
  permissions: typeof permissions;
  plans: typeof plans;
  publicRecipes: typeof publicRecipes;
  questProgress: typeof questProgress;
  quests: typeof quests;
  recipes: typeof recipes;
  revenuecat: typeof revenuecat;
  seed: typeof seed;
  shoppingList: typeof shoppingList;
  steps: typeof steps;
  stripe: typeof stripe;
  "stripe/priceMaps": typeof stripe_priceMaps;
  sugar: typeof sugar;
  users: typeof users;
  videoWorkouts: typeof videoWorkouts;
  wellness: typeof wellness;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
