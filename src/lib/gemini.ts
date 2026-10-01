import { GoogleGenerativeAI } from "@google/generative-ai";

export interface PoetryQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface PoetryData {
  verse: string;
  poet: string;
  poem: string;
  school: string;
  explanation: string;
  wisdom: string;
  questions: PoetryQuestion[];
}

export const generatePoetryQuiz = async (apiKey: string): Promise<PoetryData> => {
  // Fetch available models dynamically to avoid 404 errors with 5s timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  let response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      signal: controller.signal
    });
  } catch (e: any) {
    throw new Error("فشل الاتصال بالخادم، قد يكون الإنترنت ضعيفاً");
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || "فشل الاتصال بواجهة برمجة التطبيقات");
  }

  // Find a suitable model, prioritizing flash or pro models
  const models = data.models || [];
  const generateModels = models.filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"));
  
  // Create a priority list of models to try
  const modelsToTry = generateModels
    .map((m: any) => m.name.replace("models/", ""))
    .sort((a: string, b: string) => {
      // Priority: 3.8, then 3.5, then lite, then latest
      const score = (name: string) => {
        if (name.includes("3.8-flash")) return 10;
        if (name.includes("3.5-flash-lite")) return 9; // Lite often has less demand
        if (name.includes("3.5-flash")) return 8;
        if (name.includes("flash-latest")) return 7;
        if (name.includes("gemini-3")) return 6;
        return 0;
      };
      return score(b) - score(a);
    })
    .slice(0, 3); // ONLY TRY TOP 3 MODELS to avoid infinite loading

  if (modelsToTry.length === 0) {
    throw new Error("لم يتم العثور على أي نموذج يدعم توليد النصوص في حسابك.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  let lastError = null;
  let text = "";

  // Try models sequentially until one works
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = `
أنت أستاذ جامعي وخبير في النقد والأدب العربي. مهمتك اختيار مقطع شعري قوي (بيت إلى 3 أبيات متصلة الفكرة) من روائع الشعر العربي الأصيل (تأكد من صحتها اللغوية وسلامة وزنها).

ثم قم بتوليد 6 أسئلة "اختيار من متعدد" عميقة جداً وغير نمطية تقيس الفهم المتقدم للطالب، وتغطي عشوائياً:
- البلاغة المتقدمة (المعاني، البيان، البديع). لا تخلط المفاهيم (مثلاً: السجع محسن لفظي لا علاقة له بالعلاقات المعنوية).
- النقد الأدبي والتذوق (الوحدة العضوية، الصدق العاطفي).
- الأدب (سمات العصر والمدرسة).
- الصرف والنحو.
- المعجم والعلاقات النصية (تضاد، تعليل، دلالات دقيقة).
(تجاهل العروض والقافية تماماً).

تعليمات قاطعة وحازمة لصياغة الخيارات (Distractors):
1. الكارثة المرفوضة: يمنع منعاً باتاً جعل الخيارات الخاطئة قوالب جاهزة متكررة (مثل: سرد تاريخي، وصف منظر طبيعي، اسم شخصية وهمية، أو ذكر العكس المباشر الساذج).
2. المشتتات الذكية: يجب أن تكون الخيارات الخاطئة (المشتتات) قوية، منطقية، مقتبسة من سياق القصيدة أو من أخطاء شائعة يقع فيها الطالب الذكي. يجب أن يبدو كل خيار كأنه الإجابة الصحيحة المحتملة لولا دقيقة بلاغية أو نحوية معينة.
3. التنوع في الأسئلة: لا تكرر صيغة "ما الأسلوب البلاغي الأبرز"، بل اسأل أسئلة دقيقة مرتبطة بكلمات محددة من المقطع المختار.
4. عشوائية الإجابة الصحيحة: اجعل قيمة correctAnswerIndex رقماً عشوائياً (0 أو 1 أو 2 أو 3) في كل سؤال، إياك أن تضعها دائماً 0.

بالإضافة إلى الأسئلة، قم بتوليد:
- الحكمة المستخلصة.
- شرح وافٍ ومفصل.
- العصر أو المدرسة.
- اسم الشاعر والقصيدة.

(افصل الأبيات بعلامة \\n)
اكتب فقرة قصيرة في حقل "review" تشرح فيها مراجعتك اللغوية وتأكيدك على قوة المشتتات وتنوع الأسئلة.

أعد الناتج بصيغة JSON فقط بالهيكل التالي:
{
  "review": "مراجعتك هنا",
  "verse": "الأبيات",
  "poet": "اسم الشاعر",
  "poem": "اسم القصيدة",
  "school": "العصر أو المدرسة",
  "explanation": "الشرح",
  "wisdom": "الحكمة",
  "questions": [
    {
      "question": "نص السؤال الدقيق",
      "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "correctAnswerIndex": (رقم من 0 إلى 3)
    }
  ]
}
      `;
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 20000)
        )
      ]);
      text = result.response.text();
      break; // Success! exit the loop
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${modelName} failed:`, err.message);
      // If it's an auth error, don't try the other models
      if (err.message.includes("403") || err.message.includes("API key not valid")) {
        throw new Error("مفتاح الذكاء الاصطناعي غير صالح أو ليس لديك الصلاحية.");
      }
      // Continue to next model on 503 or 404
      continue;
    }
  }

  if (!text) {
    throw new Error(lastError?.message || "جميع النماذج تواجه ضغطاً كبيراً الآن، حاول مرة أخرى لاحقاً.");
  }
  // Extract JSON in case there are markdown codeblocks
  let cleanText = text.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.substring(7, cleanText.length - 3);
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.substring(3, cleanText.length - 3);
  }
  
  return JSON.parse(cleanText) as PoetryData;
};
