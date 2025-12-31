import { v } from "convex/values";
import { action } from "./_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

function requireGeminiApiKey() {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Set GEMINI_API_KEY (or GOOGLE_AI_API_KEY) in your Convex environment."
    );
  }
  return apiKey;
}

function getModel() {
  const genAI = new GoogleGenerativeAI(requireGeminiApiKey());
  // NOTE: Model aliases change over time. We keep a short fallback list and retry on 404 / unsupported.
  // See: https://ai.google.dev/gemini-api/docs/models
  return {
    genAI,
    models: [
      "gemini-flash-latest",
      "gemini-1.5-flash-001",
      "gemini-1.5-flash-002",
      "gemini-1.5-flash",
    ],
  };
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function isModelNotFoundOrUnsupported(err: unknown) {
  const msg = String((err as any)?.message ?? err ?? "");
  return (
    msg.includes("404") ||
    msg.toLowerCase().includes("not found") ||
    msg.toLowerCase().includes("not supported for generatecontent") ||
    msg.toLowerCase().includes("is not supported for generatecontent")
  );
}

async function generateContentWithFallback(parts: any[]) {
  const { genAI, models } = getModel();
  let lastErr: unknown = null;
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      return await model.generateContent(parts);
    } catch (err) {
      lastErr = err;
      if (isModelNotFoundOrUnsupported(err)) continue;
      throw err;
    }
  }
  throw lastErr ?? new Error("No compatible Gemini model found for generateContent.");
}

export const recognizeFoodFromImage = action({
  args: {
    // Base64 without data: prefix
    imageBase64: v.string(),
    mimeType: v.string(), // e.g. "image/jpeg"
  },
  handler: async (_ctx, args) => {
    const prompt =
      'Analyze this food image. Provide the Food Name, estimated Calories, Protein, Carbs, and Fats. Return ONLY a JSON object.\n' +
      'Exact shape:\n' +
      '{\n' +
      '  "name": "string",\n' +
      '  "calories": number,\n' +
      '  "protein": number,\n' +
      '  "carbs": number,\n' +
      '  "fat": number\n' +
      '}\n' +
      'Rules:\n' +
      '- Calories in kcal. Macros in grams.\n' +
      '- If unsure, return name="Unknown" and set numbers to 0.\n' +
      '- Output MUST be valid JSON with no extra text.';

    const result = await generateContentWithFallback([
      { text: prompt },
      {
        inlineData: {
          mimeType: args.mimeType,
          data: args.imageBase64,
        },
      },
    ]);

    const text = result.response.text();
    const parsed = safeJsonParse<{
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }>(text);

    if (parsed) return parsed;

    // Fallback: try to extract JSON block if model included commentary
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const maybe = safeJsonParse<any>(text.slice(start, end + 1));
      if (maybe) return maybe;
    }

    return {
      name: "Unknown",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
  },
});

export const generateAiRecipe = action({
  args: {
    calories: v.float64(),
    protein: v.float64(),
    carbs: v.float64(),
    fat: v.float64(),
    mealType: v.optional(v.string()),
    dietType: v.optional(v.string()),
    allergies: v.optional(v.array(v.string())),
    dislikes: v.optional(v.array(v.string())),
    requestText: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const prompt = `Create a single recipe that matches these macro targets (within ~5%):
Calories: ${args.calories}
Protein: ${args.protein}g
Carbs: ${args.carbs}g
Fat: ${args.fat}g
Meal type: ${args.mealType ?? "lunch"}
Diet type: ${args.dietType ?? "balanced"}
Allergies: ${(args.allergies ?? []).join(", ") || "none"}
Dislikes / avoid: ${(args.dislikes ?? []).join(", ") || "none"}
${args.requestText ? `Special request: ${args.requestText}` : ""}

Return ONLY valid JSON with this exact shape:
{
  "title": "string",
  "description": "string",
  "cooking_time": number,
  "servings": number,
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "steps": ["string"],
  "tags": ["string"],
  "ingredients": [
    { "name": "string", "quantity": number, "unit": "g|ml|cup|tbsp|tsp|piece" }
  ]
}`;

    const result = await generateContentWithFallback([{ text: prompt }]);
    const text = result.response.text();
    const parsed = safeJsonParse<any>(text);
    if (parsed) return parsed;

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const maybe = safeJsonParse<any>(text.slice(start, end + 1));
      if (maybe) return maybe;
    }

    throw new Error("Gemini returned invalid JSON for recipe generation.");
  },
});




