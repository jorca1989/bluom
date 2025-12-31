# Debug Onboarding Testing Guide

This guide explains how to test the Bluom.App backend logic before building the final UI.

## What's Been Created

A fully functional debug screen (`/debug-onboarding`) that allows you to:
1. Fill out all 18 onboarding questions
2. Create a test Clerk account
3. Trigger the Mifflin-St Jeor calculations
4. View calculated BMR, TDEE, calories, and macros
5. Verify plan generation (Nutrition, Fitness, Wellness)

## Prerequisites

Before testing, you MUST set up your environment:

### 1. Initialize Convex

```bash
npm run convex:init
```

This will:
- Generate your Convex deployment URL
- Create authentication keys
- Set up your backend

**Copy the Convex URL** from the terminal output.

### 2. Set Up Clerk

1. Go to https://dashboard.clerk.com
2. Create a new application
3. Enable "Email" authentication
4. Copy your **Publishable Key**

### 3. Configure JWT Template in Clerk

This is CRITICAL for Convex authentication:

1. In Clerk Dashboard → JWT Templates
2. Click "New Template"
3. Name it: `convex`
4. Set Token lifetime: `3600`
5. Add this claim:
   ```json
   {
     "aud": "convex"
   }
   ```
6. Save the template

### 4. Get Your JWT Issuer

1. In Clerk Dashboard → API Keys
2. Find **JWT Issuer** (e.g., `https://your-app.clerk.accounts.dev`)
3. Copy this URL

### 5. Update `.env` File

```bash
# Convex Configuration
EXPO_PUBLIC_CONVEX_URL=https://your-deployment-name.convex.cloud

# Clerk Authentication
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxx

# Clerk JWT Issuer Domain (for Convex auth)
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
```

## Running the Test

### 1. Start Convex Dev Server

In one terminal:

```bash
npm run convex:dev
```

Keep this running. You should see:
```
Convex deployment complete
Functions ready
```

### 2. Start Expo Dev Server

In another terminal:

```bash
npm run dev
```

Press `w` to open in web browser, or scan the QR code with Expo Go.

### 3. Fill Out the Form

The app will automatically navigate to the debug onboarding screen.

#### Sample Test Data

Use these values to test:

**Authentication:**
- Email: `test@example.com`
- Password: `Test1234!`

**Basic Info:**
- Name: John Doe
- Biological Sex: Male
- Age: 30
- Weight: 80 (kg)
- Height: 180 (cm)

**Goals:**
- Fitness Goal: Build Muscle
- Target Weight: 85 (optional)

**Fitness:**
- Experience Level: Intermediate
- Workout Preference: Mixed
- Weekly Workout Time: 5 (hours)
- Activity Level: Moderately Active

**Nutrition:**
- Nutrition Approach: High Protein
- Meals Per Day: 4

**Wellness:**
- Sleep Hours: 7.5
- Stress Level: Moderate
- Motivations: Select at least one
- Challenges: Select at least one
- 3-Month Goal: "Gain 5kg of muscle"

### 4. Submit and Wait

Click "Submit Onboarding" and watch the console for:

```
Step 1: Creating Clerk account...
Step 2: Preparing email verification...
Step 3: Attempting verification with code...
Step 4: Clerk user created: user_xxxxx
Step 5: Storing user in Convex...
Step 6: Running onboarding calculations...
Step 7: Generating plans...
```

### 5. Verify Results

After submission, you should see:

#### Calculation Results

- **BMR**: ~1800 kcal (varies by inputs)
- **TDEE**: ~2790 kcal (BMR × activity factor)
- **Daily Calorie Target**: ~3090 kcal (TDEE + 300 for muscle gain)
- **Protein**: ~176g (2.2g per kg for muscle building)
- **Carbs**: ~387g (remaining calories)
- **Fat**: ~103g (30% of calories)
- **Holistic Score**: 50-80 (based on wellness factors)

#### Generated Plans

You should see three plan IDs:
- Nutrition Plan ID
- Fitness Plan ID
- Wellness Plan ID

## What the Tests Verify

### ✅ Backend Calculations

1. **BMR (Basal Metabolic Rate)**
   - Formula: `(10 × weight) + (6.25 × height) - (5 × age) + s`
   - Where `s = +5` for males, `-161` for females

2. **TDEE (Total Daily Energy Expenditure)**
   - Formula: `BMR × Activity Factor`
   - Sedentary: 1.2, Lightly Active: 1.375, Moderately Active: 1.55, etc.

3. **Goal-Adjusted Calories**
   - Lose Weight: TDEE - 500
   - Build Muscle: TDEE + 300
   - Maintain: TDEE

4. **Macro Split**
   - Protein: Based on goal (1.6-2.5g per kg)
   - Fat: 30-40% of calories
   - Carbs: Remaining calories

### ✅ Authentication Flow

1. Clerk user creation
2. Email verification (uses development bypass)
3. Session activation
4. User stored in Convex with Clerk ID

### ✅ Database Operations

1. User profile created in `users` table
2. Nutrition plan created in `nutritionPlans` table
3. Fitness plan created in `fitnessPlans` table
4. Wellness plan created in `wellnessPlans` table

### ✅ Plan Generation

1. **Nutrition Plan**: Meal templates distributed across 4 slots
2. **Fitness Plan**: Workout split based on experience (Beginner: Full Body, Intermediate: Push/Pull/Legs, Advanced: Upper/Lower)
3. **Wellness Plan**: Sleep recommendations, meditation frequency, habit suggestions

## Troubleshooting

### Error: "Cannot find EXPO_PUBLIC_CONVEX_URL"

**Solution**: Make sure you've run `npm run convex:init` and updated your `.env` file.

### Error: "User not found"

**Solution**: The Clerk user was created but not stored in Convex. Check:
1. Convex dev server is running
2. `CLERK_JWT_ISSUER_DOMAIN` matches your Clerk dashboard
3. JWT template named "convex" exists in Clerk

### Error: "Invalid numeric input"

**Solution**: Make sure all numeric fields (age, weight, height) contain valid numbers.

### Verification Failed

This is expected in development. The code uses a bypass for email verification. In production, users would receive a real email with a verification code.

### No Results Showing

Check the browser console (F12) for errors. Look for:
- Network errors (Convex not reachable)
- Authentication errors (Clerk misconfigured)
- Validation errors (invalid inputs)

## Verifying in Convex Dashboard

1. Go to https://dashboard.convex.dev
2. Select your project
3. Click "Data" in the sidebar
4. Check these tables:
   - `users` - Should have your test user
   - `nutritionPlans` - Should have a plan with `isActive: true`
   - `fitnessPlans` - Should have a workout split
   - `wellnessPlans` - Should have wellness recommendations

You can inspect the exact data stored and verify:
- Calculated calories match expectations
- Macro split is correct
- Plans were generated with proper structure

## Testing Different Scenarios

### Test Case 1: Weight Loss (Female)

- Biological Sex: Female
- Age: 25
- Weight: 70 kg
- Height: 165 cm
- Fitness Goal: Lose Weight
- Activity Level: Lightly Active

**Expected Results:**
- BMR: ~1546 kcal
- TDEE: ~2125 kcal
- Daily Calories: ~1625 kcal (TDEE - 500)

### Test Case 2: Muscle Building (Male)

- Biological Sex: Male
- Age: 30
- Weight: 80 kg
- Height: 180 cm
- Fitness Goal: Build Muscle
- Activity Level: Very Active

**Expected Results:**
- BMR: ~1820 kcal
- TDEE: ~3140 kcal
- Daily Calories: ~3440 kcal (TDEE + 300)
- Protein: ~176g (2.2g per kg)

### Test Case 3: Maintenance (Low Activity)

- Biological Sex: Male
- Age: 40
- Weight: 90 kg
- Height: 175 cm
- Fitness Goal: Maintain Weight
- Activity Level: Sedentary

**Expected Results:**
- BMR: ~1850 kcal
- TDEE: ~2220 kcal
- Daily Calories: ~2220 kcal (no adjustment)

## Next Steps

Once you've verified the calculations and plans are working:

1. ✅ Backend logic is confirmed working
2. ✅ Clerk authentication is integrated
3. ✅ Convex mutations are functioning
4. ✅ Plan generation is operational

You can now:
- Build the production onboarding UI
- Create the dashboard tabs (Fuel, Move, Wellness)
- Implement the food/exercise logging interfaces
- Add the habit tracker
- Design the premium upgrade flow

## Console Logs

The debug screen outputs detailed logs. Watch for:

```javascript
Step 1: Creating Clerk account...
Step 2: Preparing email verification...
Step 3: Attempting verification with code...
Step 4: Clerk user created: user_2abc123xyz
Step 5: Storing user in Convex...
User stored with ID: j12abc34def5678
Step 6: Running onboarding calculations...
Onboarding result: { success: true, calculations: {...} }
Step 7: Generating plans...
Plans generated: { nutritionPlanId: ..., fitnessPlanId: ..., wellnessPlanId: ... }
```

Any errors will be clearly logged with descriptive messages.

## Production Considerations

This debug screen is NOT for production. Remove it before launch:

```bash
rm app/debug-onboarding.tsx
rm app/index.tsx  # If you created a redirect
```

For production:
1. Build a proper onboarding flow with progress indicators
2. Add input validation with error messages
3. Implement the "blurred preview" paywall
4. Add analytics tracking
5. Handle edge cases and errors gracefully
6. Add loading states and animations

## Support

If you encounter issues:

1. Check the SETUP.md for environment setup
2. Review CONVEX_API.md for API reference
3. Verify all environment variables are set
4. Check both terminal outputs (Convex + Expo)
5. Inspect browser console for errors
6. Verify data in Convex Dashboard

The debug screen provides a complete end-to-end test of your backend infrastructure!
