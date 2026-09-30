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
  const genAI = new GoogleGenerativeAI(apiKey);
  // Using gemini-1.5-flash for fast responses
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
