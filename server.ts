import express from "express";
import path from "path";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// CORS headers for all API requests (supporting PWAs, mobile, preview iframes)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-gemini-api-key");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Helper to clean API key strings (strips quotes, whitespace, Bearer prefix)
function sanitizeApiKey(k: unknown): string {
  if (!k || typeof k !== "string") return "";
  return k.trim().replace(/^Bearer\s+/i, "").replace(/^["']|["']$/g, "").trim();
}

// System instruction ensuring the AI acts as an elite NQ/MNQ trading risk manager & mentor
const TRADING_ASSISTANT_SYSTEM_INSTRUCTION = `
אתה עוזר בינה מלאכותית מקצועי, מנטור מסחר ומנהל סיכונים אישי (Risk Desk Manager) המתמחה במסחר בחוזים עתידיים על מדד הנאסד״ק (NQ / MNQ) ובפסיכולוגיית מסחר.

תפקידך:
1. לזכור, להכיר לעומק ולנתח את כל המידע שמוזן לאפליקציה: כל העסקאות, החשבונות (למשל Bulenox, Lucid, Live), שיטת הבלוקים (פרק 1 עם טווחי ATR ו-10 עסקאות לבלוק; פרק 2 עם מקסימום 4 עסקאות ליום ונעילה ב-2 הפסדים רצופים או 2 ניצחונות), יחס סיכון-סיכוי, תאימות VWAP, כמות חוזים, עמלות NinjaTrader ($1.65 לחוזה), יציאות בברייק איוון, והיומן האישי (שאלות יומיות על 3 חוקי הברזל, ציון מצב מנטלי 1-5, איכות עסקאות 1-5 והערות סוחר).
2. לנתח דפוסים אישיים: שעות בהן הסוחר מרוויח או מפסיד, התנהגות לאחר הפסד (זיהוי מסחר מתוך נקמה - Revenge Trading או הגדלת חוזים אסורה), השפעת המצב המנטלי על התוצאות, עמידה ביחס R:R, ותאימות ל-VWAP.
3. לספק משוב חד, מקצועי, מעודד אך לא מתפשר על משמעת וניהול סיכונים. אם הסוחר חווה יום קשה, עזור לו לנתח בקור רוח. אם הוא מפר חוקים, התרע בפניו מיידית.
4. השב תמיד בעברית רהוטה, ברורה, מדויקת ומעשית של שוק ההון והחוזים העתידיים. השתמש במושגי מסחר מוכרים (לונג, שורט, ברייק-איוון, ATR, VWAP, R:R, Drawdown, עמלות, P&L).
5. התבסס באופן ישיר ומלא על נתוני המסחר והיומן שמועברים אליך בהקשר!
6. עזרה במילוי והגדרת ערכים ומדדים בסטטיסטיקה:
   כאשר הסוחר מבקש ממך להגדיר, לחשב או לעדכן ערכים בסטטיסטיקה (למשל: יעד רווח חודשי, Drawdown מקסימלי, יתרת חשבון, יעד אחוז הצלחה, ממוצע יומי רצוי וכו'), הסבר לו בקצרה ובסוף התשובה הוסף בלוק פעולה של סטטיסטיקה בפורמט הבא:
   \`\`\`stat_action
   {
     "label": "שם המדד (למשל: יעד רווח חודשי)",
     "value": "הערך (למשל: $3,500 או 65%)",
     "category": "target",
     "description": "הסבר קצר על המדד"
   }
   \`\`\`
   קטגוריות אפשריות: "target" (יעד), "rule" (חוק/מגבלה), "metric" (מדד), "note" (הערה).
   האפליקציה תזהה את הבלוק ותציג לסוחר כפתור בלחיצה אחת לעדכון מיידי של הסטטיסטיקה שלו!
`;

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Comprehensive verification endpoint aliases (handles GET, POST, etc.)
app.all(
  ["/api/gemini/verify-key", "/api/verify-key", "/api/gemini/verify", "/api/verify", "/api/key/verify", "/api/check-key"],
  async (req, res) => {
    const rawKey =
      (req.headers["x-gemini-api-key"] as string) ||
      req.body?.apiKey ||
      req.body?.key ||
      (req.query?.apiKey as string) ||
      (req.query?.key as string);

    const cleanUserKey = sanitizeApiKey(rawKey);
    const apiKey = cleanUserKey || sanitizeApiKey(process.env.GEMINI_API_KEY);

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.json({
        valid: false,
        message: "לא הוגדר מפתח API. אנא הדבק את מפתח ה-API האישי שלך המתחיל ב-AIzaSy."
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    let verified = false;
    let verifiedModel = "";
    let lastError = "";

    // 1. Ultra-fast check: models.list verifies credentials in ~120ms without generation latency
    try {
      const modelIterable = await withTimeout(ai.models.list(), 3500, "פסק זמן בבדיקת מודלים");
      for await (const m of modelIterable) {
        if (m && m.name) {
          verified = true;
          verifiedModel = m.name;
          break;
        }
      }
    } catch (listErr: any) {
      lastError = listErr?.message || String(listErr);
      console.warn("[Gemini Verify] models.list check error:", lastError);
    }

    // 2. Fallback check: try quick ping on gemini-3.1-flash-lite if models.list had an issue
    if (!verified) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: "ping",
          }),
          4000,
          "פסק זמן"
        );
        if (response && response.text) {
          verified = true;
          verifiedModel = "gemini-3.1-flash-lite";
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
      }
    }

    if (verified) {
      return res.json({
        valid: true,
        isCustom: !!cleanUserKey,
        model: verifiedModel || "gemini-3.1-flash-lite",
        message: cleanUserKey
          ? "מפתח API אישי אומת וחובר בהצלחה לצ׳אט!"
          : "מפתח המערכת פעיל ומחובר בהצלחה לצ׳אט!"
      });
    }

    let friendlyMessage = "לא ניתן היה לאמת את המפתח מול שרתי Google.";
    if (lastError.includes("API_KEY_INVALID") || lastError.includes("API key not valid")) {
      friendlyMessage = "מפתח ה-API אינו תקין. ודא שהעתקת מפתח מלא מ-Google AI Studio (מתחיל ב-AIzaSy).";
    } else if (lastError.includes("PERMISSION_DENIED")) {
      friendlyMessage = "הרשאה נדחתה. ודא שה-API של Gemini פתוח ופעיל בפרויקט שלך.";
    } else if (lastError.includes("RESOURCE_EXHAUSTED") || lastError.includes("429")) {
      // Quota exceeded still means the key is valid!
      return res.json({
        valid: true,
        isCustom: !!cleanUserKey,
        message: "המפתח תקין ומחובר! (נמצא כרגע במגבלת מכסה זמנית של גוגל)"
      });
    } else if (lastError) {
      friendlyMessage = `שגיאה באימות המפתח: ${lastError.slice(0, 120)}`;
    }

    return res.json({
      valid: false,
      message: friendlyMessage
    });
  }
);

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
  ]);
}

// Chat endpoint supporting manual model selection, search grounding, and auto fallback
app.all(["/api/gemini/chat", "/api/chat"], async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).json({ status: "chat_ready" });
  }

  const { message, history, tradingContext, model, enableWebSearch } = req.body;
  const userKey = (req.headers["x-gemini-api-key"] as string) || req.body?.apiKey;
  const apiKey = (userKey && String(userKey).trim()) || process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return res.status(400).json({
      error: "חסר מפתח API של Gemini. אנא ודא שהמפתח מוגדר ב-Settings > Secrets או הזן מפתח בהגדרות."
    });
  }

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "הודעה ריקה." });
  }

  // Model selection resolution - Default to the ultra-fast, high-availability 3.1 Flash Lite
  const requestedModel = (model && model !== "auto") ? String(model).trim() : null;
  const DEFAULT_PRIMARY = "gemini-3.1-flash-lite";
  const DEFAULT_FALLBACK = "gemini-3-flash-preview";

  const targetModel = requestedModel || DEFAULT_PRIMARY;

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // Build trading context
  const contextString = `
[נתוני יומן, עסקאות, בלוקים וערכי סטטיסטיקה עדכניים מהאפליקציה]:
${tradingContext ? JSON.stringify(tradingContext, null, 2) : "לא סופק הקשר נתונים"}
`;

  const contents: any[] = [];

  // Inject trading context as initial system-like knowledge
  contents.push({
    role: "user",
    parts: [{ text: `זהו כל המידע והנתונים של יומן המסחר שלי עד לרגע זה:\n${contextString}\nאנא שמור מידע זה בזיכרון השיחה והתייחס אליו בכל תשובותיך.` }]
  });
  contents.push({
    role: "model",
    parts: [{ text: "קיבלתי ולמדתי את כל נתוני המסחר, העסקאות, החשבונות, הבלוקים, הסטטיסטיקות והיומן שלך. אני זוכר הכל ומוכן לעזור לך לנתח, להשתפר, לעדכן מדדים ולשמור על ניהול סיכונים ללא פשרות. במה תרצה שנתמקד?" }]
  });

  // Append history
  if (Array.isArray(history)) {
    for (const h of history) {
      if (h && h.text && (h.role === "user" || h.role === "model")) {
        contents.push({
          role: h.role,
          parts: [{ text: String(h.text) }]
        });
      }
    }
  }

  // Append current user message
  contents.push({
    role: "user",
    parts: [{ text: message }]
  });

  let text = "";
  let modelUsed = targetModel;
  let isFallback = false;
  let fallbackReason = "";
  let webSearchUsed = false;

  // Build tools config if web search is enabled
  const toolsConfig = enableWebSearch ? [{ googleSearch: {} }] : undefined;

  // Attempt generation with selected model
  try {
    const config: any = {
      systemInstruction: TRADING_ASSISTANT_SYSTEM_INSTRUCTION,
      thinkingConfig: {
        thinkingLevel: targetModel === "gemini-3.1-flash-lite" ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW,
      },
    };
    if (toolsConfig) {
      config.tools = toolsConfig;
    }

    const response = await withTimeout(
      ai.models.generateContent({
        model: targetModel,
        contents,
        config,
      }),
      8000,
      `זמן מענה של ${targetModel} חרג מ-8 שניות (עומס זמני)`
    );
    text = response.text || "";
    webSearchUsed = !!enableWebSearch;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.warn(`[Gemini] Attempt with ${targetModel} (webSearch=${enableWebSearch}) failed:`, errMsg);

    const isQuotaOrOverload = errMsg.includes("503") || errMsg.includes("429") || errMsg.includes("404") || errMsg.includes("not found") || errMsg.includes("UNAVAILABLE") || errMsg.includes("RESOURCE_EXHAUSTED");

    // If failed due to search tool (and not server overload or missing model), try same model without webSearch
    if (enableWebSearch && !isQuotaOrOverload) {
      try {
        const retryResponse = await ai.models.generateContent({
          model: targetModel,
          contents,
          config: {
            systemInstruction: TRADING_ASSISTANT_SYSTEM_INSTRUCTION,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          },
        });
        text = retryResponse.text || "";
        webSearchUsed = false;
      } catch (retryErr: any) {
        console.warn(`[Gemini] Non-search retry with ${targetModel} failed:`, retryErr?.message || retryErr);
      }
    }

    // If still no text and target isn't the fallback model, immediately invoke DEFAULT_FALLBACK
    if (!text && targetModel !== DEFAULT_FALLBACK) {
      isFallback = true;
      modelUsed = DEFAULT_FALLBACK;
      fallbackReason = errMsg.includes("404") || errMsg.includes("not found")
        ? "המודל המבוקש לא נמצא בחשבונך (עבר אוטומטית ל-Flash Lite)"
        : (errMsg.includes("503") ? "עומס זמני על המודל הראשי (עבר לגיבוי)" : (errMsg.slice(0, 100)));

      try {
        const fallbackResponse = await ai.models.generateContent({
          model: DEFAULT_FALLBACK,
          contents,
          config: {
            systemInstruction: TRADING_ASSISTANT_SYSTEM_INSTRUCTION,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          },
        });
        text = fallbackResponse.text || "";
        webSearchUsed = false;
      } catch (fallbackErr: any) {
        console.error(`[Gemini] Fallback model (${DEFAULT_FALLBACK}) also failed:`, fallbackErr?.message || fallbackErr);
        return res.status(500).json({
          error: `שגיאה בתקשורת עם שרתי גמיני: ${fallbackErr?.message || "לא ניתן להשלים את הבקשה כעת."}`,
          primaryError: errMsg
        });
      }
    } else if (!text) {
      return res.status(500).json({
        error: `שגיאה במודל ${targetModel}: ${errMsg || "נסה שנית בעוד רגע."}`
      });
    }
  }

  return res.json({
    text,
    modelUsed,
    isFallback,
    fallbackReason: isFallback ? fallbackReason : undefined,
    webSearchUsed
  });
});

// Start server and mount Vite
async function startServer() {
  const publicPath = path.join(process.cwd(), "public");
  app.use(express.static(publicPath));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Trading Journal app running on port ${PORT}`);
  });
}

startServer();
