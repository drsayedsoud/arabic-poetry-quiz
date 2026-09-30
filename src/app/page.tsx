"use client";

import { useState, useEffect } from "react";
import { Settings, RefreshCw, Key, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { generatePoetryQuiz, PoetryData } from "@/lib/gemini";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PoetryData | null>(null);
  
  // Quiz state
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedKey = localStorage.getItem("gemini_api_key");
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      setIsSettingsOpen(true);
    }
  }, []);

  const saveApiKey = (key: string) => {
    localStorage.setItem("gemini_api_key", key);
    setApiKey(key);
    setIsSettingsOpen(false);
  };

  const fetchNewQuiz = async () => {
    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }
    setLoading(true);
    setError("");
    setShowResults(false);
    setAnswers({});
    setData(null);
    try {
      const result = await generatePoetryQuiz(apiKey);
      setData(result);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي. تأكد من صحة المفتاح.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qIndex: number, optIndex: number) => {
    if (showResults) return;
    setAnswers((prev) => ({ ...prev, [qIndex]: optIndex }));
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length < (data?.questions.length || 0)) {
      alert("الرجاء الإجابة على جميع الأسئلة أولاً!");
      return;
    }
    setShowResults(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-slate-800 shadow-md border-b border-slate-700">
        <h1 className="text-xl md:text-2xl font-bold text-emerald-400">روائع الشعر العربي</h1>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition-colors"
          title="الإعدادات"
        >
          <Settings className="w-6 h-6 text-slate-300" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col items-center">
        {!data && !loading && (
          <div className="flex flex-col items-center justify-center mt-20 text-center space-y-6">
            <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <span className="text-4xl text-emerald-400">📜</span>
            </div>
            <h2 className="text-3xl font-bold">مرحباً بك في تحدي الشعر</h2>
            <p className="text-slate-400 max-w-md text-lg">
              ولد بيتاً من الشعر العربي الأصيل واختبر معلوماتك في البلاغة والأدب.
            </p>
            <button
              onClick={fetchNewQuiz}
              className="mt-4 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-2 space-x-reverse"
            >
              <RefreshCw className="w-6 h-6" />
              <span>توليد بيت شعر جديد</span>
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center mt-32 space-y-4">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-emerald-400 font-medium animate-pulse">جاري استحضار روائع الشعر...</p>
          </div>
        )}

        {error && (
          <div className="mt-8 p-4 bg-red-500/20 border border-red-500 rounded-xl text-red-200 text-center w-full">
            {error}
          </div>
        )}

        <AnimatePresence>
          {data && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-8 pb-20"
            >
              <div className="bg-slate-800 rounded-2xl p-6 md:p-10 shadow-2xl border border-slate-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <h2 className="text-3xl md:text-5xl font-bold text-center leading-relaxed text-emerald-300 py-8 font-serif">
                  "{data.verse}"
                </h2>
              </div>

              <div className="space-y-6">
                {data.questions.map((q, qIndex) => (
                  <div key={qIndex} className="bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-700">
                    <h3 className="text-xl font-semibold mb-4 flex items-start text-slate-200">
                      <span className="bg-emerald-500/20 text-emerald-400 w-8 h-8 rounded-full flex items-center justify-center ml-3 shrink-0">
                        {qIndex + 1}
                      </span>
                      {q.question}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      {q.options.map((opt, optIndex) => {
                        const isSelected = answers[qIndex] === optIndex;
                        const isCorrect = q.correctAnswerIndex === optIndex;
                        let btnClass = "border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-300";
                        
                        if (showResults) {
                          if (isCorrect) {
                            btnClass = "border-emerald-500 bg-emerald-500/20 text-emerald-300";
                          } else if (isSelected && !isCorrect) {
                            btnClass = "border-red-500 bg-red-500/20 text-red-300";
                          } else {
                            btnClass = "border-slate-700 bg-slate-800 opacity-50";
                          }
                        } else if (isSelected) {
                          btnClass = "border-emerald-500 bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500";
                        }

                        return (
                          <button
                            key={optIndex}
                            onClick={() => handleSelectOption(qIndex, optIndex)}
                            disabled={showResults}
                            className={`p-4 rounded-xl border text-right transition-all flex items-center justify-between ${btnClass}`}
                          >
                            <span>{opt}</span>
                            {showResults && isCorrect && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                            {showResults && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {!showResults ? (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={handleSubmit}
                    className="px-10 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/20 transition-transform hover:scale-105"
                  >
                    عرض النتيجة والشرح
                  </button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-emerald-900/30 rounded-2xl p-6 md:p-8 border border-emerald-500/30 space-y-6 mt-8"
                >
                  <h3 className="text-2xl font-bold text-emerald-400 border-b border-emerald-500/30 pb-4">
                    تفاصيل البيت الشعري
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <span className="text-emerald-500/80 text-sm font-bold">الشاعر</span>
                      <p className="text-lg font-medium">{data.poet}</p>
                    </div>
                    <div className="space-y-2">
                      <span className="text-emerald-500/80 text-sm font-bold">القصيدة</span>
                      <p className="text-lg font-medium">{data.poem}</p>
                    </div>
                    <div className="space-y-2">
                      <span className="text-emerald-500/80 text-sm font-bold">العصر / المدرسة</span>
                      <p className="text-lg font-medium">{data.school}</p>
                    </div>
                    <div className="space-y-2">
                      <span className="text-emerald-500/80 text-sm font-bold">الحكمة</span>
                      <p className="text-lg font-medium">{data.wisdom}</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-emerald-500/30">
                    <span className="text-emerald-500/80 text-sm font-bold">الشرح التفصيلي</span>
                    <p className="text-lg leading-relaxed text-slate-300">{data.explanation}</p>
                  </div>

                  <div className="flex justify-center pt-6">
                    <button
                      onClick={fetchNewQuiz}
                      className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold flex items-center space-x-2 space-x-reverse transition-colors"
                    >
                      <RefreshCw className="w-5 h-5" />
                      <span>توليد بيت جديد</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-700">
            <h2 className="text-2xl font-bold mb-6 flex items-center text-emerald-400">
              <Settings className="w-6 h-6 ml-2" />
              الإعدادات
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  مفتاح واجهة برمجة التطبيقات (Gemini API Key)
                </label>
                <div className="relative">
                  <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    dir="ltr"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pr-10 pl-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="AIzaSy..."
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  يتم حفظ المفتاح محلياً في متصفحك فقط ولا يتم إرساله لأي خادم آخر. يمكنك الحصول على مفتاح مجاني من منصة Google AI Studio.
                </p>
              </div>
              <button
                onClick={() => saveApiKey(apiKey)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors mt-6"
              >
                حفظ الإعدادات
              </button>
              {localStorage.getItem("gemini_api_key") && (
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full py-3 bg-transparent border border-slate-600 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors"
                >
                  إلغاء
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
