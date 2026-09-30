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
  // Fetch available models dynamically to avoid 404 errors
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || "فشل الاتصال بواجهة برمجة التطبيقات");
  }

  // Find a suitable model, prioritizing flash or pro models
  const models = data.models || [];
  const generateModels = models.filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"));
  
  if (generateModels.length === 0) {
    throw new Error("لم يتم العثور على أي نموذج يدعم توليد النصوص في حسابك.");
  }

  // Prefer gemini-1.5-flash, then gemini-1.5-pro, then any gemini model
  let selectedModelName = generateModels[0].name.replace("models/", "");
  const preferred = generateModels.find((m: any) => m.name.includes("gemini-1.5-flash") || m.name.includes("gemini-2.0-flash"));
  if (preferred) selectedModelName = preferred.name.replace("models/", "");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: selectedModelName });

  const prompt = `
أنت خبير في الأدب العربي والشعر. قم باختيار بيت شعر واحد من روائع الشعر العربي (تأكد أن البيت مشهور وقوي).
ثم قم بتوليد الأسئلة التالية حول هذا البيت بصيغة اختيار من متعدد (سؤال و 4 خيارات).
الأسئلة المطلوبة:
1. المحسنات البديعية (لفظي أو معنوي) في البيت.
2. الغرض الرئيسي من البيت.
3. الحكمة المستخلصة من البيت.
4. شرح البيت.
5. إلى أي مدرسة شعرية أو عصر ينتمي البيت.
6. من هو قائل البيت وفي أي قصيدة.

يجب أن تعيد الناتج بصيغة JSON فقط، بدون أي نصوص إضافية، بالهيكل التالي:
{
  "verse": "البيت الشعري هنا",
  "poet": "اسم الشاعر",
  "poem": "اسم القصيدة",
  "school": "العصر أو المدرسة الشعرية",
  "explanation": "شرح وافٍ للبيت",
  "wisdom": "الحكمة من البيت",
  "questions": [
    {
      "question": "نص السؤال هنا",
      "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "correctAnswerIndex": 0 // رقم الخيار الصحيح (من 0 إلى 3)
    }
  ]
}
  `;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  // Extract JSON in case there are markdown codeblocks
  let cleanText = text.trim();
  if (cleanText.startsWith('\`\`\`json')) {
    cleanText = cleanText.substring(7, cleanText.length - 3);
  } else if (cleanText.startsWith('\`\`\`')) {
    cleanText = cleanText.substring(3, cleanText.length - 3);
  }
  
  return JSON.parse(cleanText) as PoetryData;
};
