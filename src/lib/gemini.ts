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
أنت خبير في الأدب العربي والشعر. قم باختيار مقطع شعري (من بيت واحد إلى 3 أبيات متصلة إذا كانت الفكرة والموضوع واحداً) من روائع الشعر العربي (تأكد أن الأبيات مشهورة وقوية).
ثم قم بتوليد الأسئلة التالية حول هذا المقطع بصيغة اختيار من متعدد (سؤال و 4 خيارات).

الأسئلة المطلوبة (يجب أن تولد 6 أسئلة بالضبط):
1. سؤال في البلاغة (محسن بديعي مثل طباق، مقابلة، جناس، أو صورة بيانية مثل تشبيه، استعارة).
2. سؤال عن الغرض الشعري لهذه الأبيات (غزل، فخر، رثاء، حكمة، إلخ).
3. سؤال عن معاني المفردات أو دلالة كلمة معينة في السياق.
4. سؤال في النحو (إعراب كلمة بارزة ومهمة في المقطع).
5. سؤال عن العلاقات (علاقة شطر بشطر، أو كلمة بكلمة: تعليل، نتيجة، ترادف، تضاد).
6. سؤال عن الشاعر، أو العصر، أو الفهم العام لمعنى المقطع.

بالإضافة إلى الأسئلة، قم بتوليد:
- الحكمة المستخلصة من الأبيات.
- شرح وافٍ ومفصل للأبيات.
- العصر أو المدرسة الشعرية.
- اسم الشاعر والقصيدة.

ملاحظة: إذا كان المقطع أكثر من بيت، افصل بين الأبيات بعلامة سطر جديد (\\n).

يجب أن تعيد الناتج بصيغة JSON فقط، بدون أي نصوص إضافية، بالهيكل التالي:
{
  "verse": "الأبيات الشعرية هنا",
  "poet": "اسم الشاعر",
  "poem": "اسم القصيدة",
  "school": "العصر أو المدرسة الشعرية",
  "explanation": "شرح وافٍ للأبيات",
  "wisdom": "الحكمة من الأبيات",
  "questions": [
    {
      "question": "نص السؤال الأول",
      "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "correctAnswerIndex": 0
    }
  ]
}
      `;
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 10000)
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
