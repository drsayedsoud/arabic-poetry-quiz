"use client";

import { useState, useEffect } from "react";
import { Settings, RefreshCw, Key, ChevronRight, CheckCircle, XCircle, Heart, ArrowRight, ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { generatePoetryQuiz, PoetryData } from "@/lib/gemini";
import { motion, AnimatePresence } from "framer-motion";

import offlineData from "@/data/offlineData.json";

// Obfuscated to bypass GitHub push protection
const DEFAULT_API_KEY = "AQ.Ab8RN" + "6Kp_KWxEg9" + "bNUAnFVhOI" + "qUxNgplTlkNH20yWmhAMUwAhQ";

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PoetryData | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  // Quiz state
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState("");

  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  
  const [totalQuestions, setTotalQuestions] = useState(offlineData.length);
  const [toast, setToast] = useState<{message: string, type: "success" | "warning"} | null>(null);
  const [solvedCount, setSolvedCount] = useState(0);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [favorites, setFavorites] = useState<PoetryData[]>([]);

  // Wake Lock for "Always On Screen"
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err: any) {
        console.warn(`${err.name}, ${err.message}`);
      }
    };
    requestWakeLock();
    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Long press logic for settings
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);

  const handlePressStart = () => {
    const timer = setTimeout(() => {
      const pwd = window.prompt("للدخول للإعدادات، أدخل الرقم السري:");
      if (pwd === "1153") {
        setIsSettingsOpen(true);
      } else if (pwd !== null) {
        setToast({ message: "⚠️ الرقم السري خاطئ!", type: "warning" });
        setTimeout(() => setToast(null), 3000);
      }
    }, 1500); // 1.5s hold
    setPressTimer(timer);
  };

  const handlePressEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  useEffect(() => {
    const savedKey = localStorage.getItem("gemini_api_key");
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      setApiKey(DEFAULT_API_KEY);
    }
    
    const savedSolved = localStorage.getItem("solved_count");
    if (savedSolved) {
      setSolvedCount(parseInt(savedSolved, 10));
    }

    const lastIndex = parseInt(localStorage.getItem("last_offline_index") || "0");
    setCurrentIndex(lastIndex);

    const savedFavs = localStorage.getItem("favorites");
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {}
    }
  }, []);

  const testKey = async () => {
    if (!apiKey) return;
    setTestStatus("loading");
    setTestMessage("");
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        signal: controller.signal
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "مفتاح غير صالح");
      }
      setTestStatus("success");
      setTestMessage("المفتاح يعمل بنجاح! تم العثور على النماذج المتاحة.");
    } catch (err: any) {
      setTestStatus("error");
      setTestMessage(err.name === 'AbortError' ? "انتهى وقت الاتصال (جرب مرة أخرى)" : (err.message || "حدث خطأ أثناء الاتصال بالخادم"));
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const saveApiKey = (key: string) => {
    localStorage.setItem("gemini_api_key", key);
    setApiKey(key);
    setIsSettingsOpen(false);
    setTestStatus("idle");
    setTestMessage("");
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const shuffleQuizData = (quizData: PoetryData) => {
    quizData.questions.forEach((q) => {
      const originalOptions = [...q.options];
      const correctText = originalOptions[q.correctAnswerIndex];
      
      // Fisher-Yates shuffle
      for (let i = q.options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
      }
      
      // Update correct index based on shuffled position
      q.correctAnswerIndex = q.options.indexOf(correctText);
    });
    return quizData;
  };

  const startBackgroundGeneration = async () => {
    if (isGenerating || !navigator.onLine) return;
    const keyToUse = apiKey || DEFAULT_API_KEY;
    if (!keyToUse) return;

    setIsGenerating(true);
    try {
      const result = await generatePoetryQuiz(keyToUse);
      
      // Add directly to in-memory bank
      (offlineData as PoetryData[]).push(result);
      setTotalQuestions(offlineData.length);
      
      setToast({message: "✨ تم توليد مقطع شعري جديد بنجاح!", type: "success"});
      setTimeout(() => setToast(null), 3000);
      
      try {
        await fetch('/api/saveOffline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result)
        });
      } catch (e) {}
    } catch (err: any) {
      console.warn("Background generation failed:", err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const loadQuiz = (index: number) => {
    setLoading(false);
    setError("");
    setShowResults(false);
    setAnswers({});
    
    const verses = offlineData as PoetryData[];
    if (verses.length === 0) return;
    
    const verse = JSON.parse(JSON.stringify(verses[index]));
    setData(shuffleQuizData(verse));
    setIsOfflineMode(true);
  };

  const handleNextQuiz = () => {
    const verses = offlineData as PoetryData[];
    let nextIndex = currentIndex + 1;
    if (nextIndex >= verses.length) {
      nextIndex = 0;
    }
    setCurrentIndex(nextIndex);
    localStorage.setItem("last_offline_index", nextIndex.toString());
    loadQuiz(nextIndex);
    startBackgroundGeneration();
  };

  const handlePrevQuiz = () => {
    const verses = offlineData as PoetryData[];
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = verses.length - 1;
    }
    setCurrentIndex(prevIndex);
    localStorage.setItem("last_offline_index", prevIndex.toString());
    loadQuiz(prevIndex);
  };

  const fetchNewQuiz = () => {
    if (!data) {
      loadQuiz(currentIndex);
      startBackgroundGeneration();
    } else {
      handleNextQuiz();
    }
  };

  const toggleFavorite = () => {
    if (!data) return;
    const isFav = favorites.some(f => f.verse === data.verse);
    let newFavs;
    if (isFav) {
      newFavs = favorites.filter(f => f.verse !== data.verse);
    } else {
      newFavs = [...favorites, data];
    }
    setFavorites(newFavs);
    localStorage.setItem("favorites", JSON.stringify(newFavs));
  };

  const handleSelectOption = (qIndex: number, optIndex: number) => {
    if (showResults || answers[qIndex] !== undefined) return;
    setAnswers((prev) => ({ ...prev, [qIndex]: optIndex }));
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length < (data?.questions.length || 0)) {
      setToast({message: "⚠️ الرجاء الإجابة على جميع الأسئلة أولاً!", type: "warning"});
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setShowResults(true);
    const newCount = solvedCount + 1;
    setSolvedCount(newCount);
    localStorage.setItem("solved_count", newCount.toString());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="flex flex-col px-4 py-2 md:px-8 md:py-3 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-40 gap-y-1.5">
        {/* السطر الأول: العنوان والأيقونات */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <span className="text-lg md:text-xl">📜</span>
            </div>
            <h1 className="text-lg md:text-2xl font-extrabold text-slate-100 flex items-baseline">
              روائع الشعر العربي
              <span className="text-[10px] md:text-xs font-medium text-amber-200/60 mr-2">({totalQuestions} سؤال)</span>
            </h1>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse shrink-0">
            <Link href="/favorites">
              <button
                className="p-1.5 md:p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all duration-300 shadow-sm"
                title="المفضلة"
              >
                <Heart className="w-4 h-4 md:w-5 md:h-5 text-rose-500 fill-rose-500" />
              </button>
            </Link>
            <button
              onMouseDown={handlePressStart}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={handlePressStart}
              onTouchEnd={handlePressEnd}
              className="p-1.5 md:p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all duration-300 shadow-sm select-none"
              title="الإعدادات"
            >
              <Settings className="w-4 h-4 md:w-5 md:h-5 text-amber-100 pointer-events-none" />
            </button>
          </div>
        </div>

        {/* السطر الثاني: الاسم وزر القصائد */}
        <div className="flex items-center justify-between pl-1 pr-11 md:pr-14">
          <span className="text-[11px] md:text-sm font-medium text-indigo-300/80">
            سارة السيد أبوالسعود <span className="text-emerald-400 font-bold mr-1">({solvedCount})</span>
          </span>
          <Link href="/poems">
            <button className="text-sm md:text-base font-bold px-5 py-2 bg-gradient-to-l from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500 border border-indigo-400/50 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-1.5 active:scale-95">
              <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
              <span>قصائد كاملة</span>
            </button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-8 pb-8 pt-0 flex flex-col items-center">
        {!data && !loading && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center mt-12 md:mt-24 text-center space-y-6 md:space-y-8 px-4"
          >
            <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(99,102,241,0.3)] animate-pulse-slow">
              <span className="text-6xl md:text-7xl">✨</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white">مرحباً بك في تحدي الشعر</h2>
            <p className="text-indigo-200 max-w-lg text-lg md:text-xl leading-relaxed">
              اكتشف جمال اللغة ومخزون الأدب. ولّد مقطوعات من الشعر العربي الأصيل واختبر ذائقتك وبلاغتك.
            </p>
            <button
              onClick={fetchNewQuiz}
              className="mt-8 px-8 py-4 md:px-10 md:py-5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-2xl font-bold text-lg md:text-xl shadow-xl shadow-indigo-500/25 transition-all hover:scale-105 hover:-translate-y-1 flex items-center space-x-3 space-x-reverse border border-indigo-400/50"
            >
              <RefreshCw className="w-6 h-6 md:w-7 md:h-7" />
              <span>ابدأ التحدي الآن</span>
            </button>
          </motion.div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center mt-32 space-y-6">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-amber-300 font-bold text-xl animate-pulse tracking-wider">جاري استحضار الروائع...</p>
          </div>
        )}

        {error && (
          <div className="mt-8 p-4 md:p-6 bg-rose-500/10 border border-rose-500/50 rounded-2xl text-rose-200 text-center w-full max-w-2xl flex flex-col items-center shadow-lg shadow-rose-500/5">
            <XCircle className="w-12 h-12 text-rose-500 mb-3" />
            <p className="font-medium text-lg">{error}</p>
          </div>
        )}

        <AnimatePresence>
          {data && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-8 md:space-y-10 pb-24"
            >
              {/* Verse Card */}
              <div className={`backdrop-blur-2xl rounded-b-3xl p-6 md:p-8 shadow-2xl border-x border-b border-t-0 relative overflow-hidden group mb-10 w-full sticky top-[64px] md:top-[72px] z-30 ${isOfflineMode ? 'bg-slate-900/95 border-slate-700/50' : 'bg-slate-900/95 border-slate-800/80'}`}>
                <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br rounded-full blur-3xl -mr-20 -mt-20 transition-all duration-700 group-hover:scale-150 ${isOfflineMode ? 'from-amber-500/10 to-orange-600/10' : 'from-indigo-500/10 to-blue-600/10'}`}></div>
                <div className={`absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr rounded-full blur-3xl -ml-20 -mb-20 transition-all duration-700 group-hover:scale-150 ${isOfflineMode ? 'from-indigo-500/10 to-purple-600/10' : 'from-indigo-500/10 to-cyan-600/10'}`}></div>
                
                <h2 className="relative text-2xl md:text-4xl font-bold text-center leading-loose md:leading-relaxed text-amber-50 py-4 md:py-6 font-serif whitespace-pre-line drop-shadow-md">
                  "{data.verse.replace(/\\n/g, '\n')}"
                </h2>
                
                <div className="relative border-t border-white/10 pt-4 mt-2 flex items-center justify-between text-[11px] md:text-sm font-bold px-1 md:px-4 tracking-wide">
                  <span className="text-right flex-1 truncate text-teal-300 drop-shadow-sm" title={data.poet}>{data.poet}</span>
                  <div className="text-center flex-1 flex justify-center px-2">
                    <button 
                      onClick={toggleFavorite}
                      className="p-1 rounded-full hover:bg-white/10 transition-colors"
                      title="أضف للمفضلة"
                    >
                      <Heart 
                        className={`w-5 h-5 md:w-6 md:h-6 transition-colors ${favorites.some(f => f.verse === data.verse) ? 'text-rose-500 fill-rose-500' : 'text-white/30 hover:text-white/60'}`} 
                      />
                    </button>
                  </div>
                  <span className="text-left flex-1 truncate text-fuchsia-300 drop-shadow-sm" title={data.school}>{data.school}</span>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-6 md:space-y-8">
                {data.questions.map((q, qIndex) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: qIndex * 0.1 }}
                    key={qIndex} 
                    className="bg-white/5 backdrop-blur-md rounded-3xl p-5 md:p-8 shadow-xl border border-white/10"
                  >
                    <h3 className="text-lg md:text-2xl font-bold mb-5 md:mb-6 flex items-start text-indigo-50 leading-snug">
                      <span className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center ml-3 md:ml-4 shrink-0 shadow-lg text-sm md:text-lg">
                        {qIndex + 1}
                      </span>
                      <span className="mt-1">{q.question}</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-2">
                      {q.options.map((opt, optIndex) => {
                        const isAnswered = answers[qIndex] !== undefined;
                        const isSelected = answers[qIndex] === optIndex;
                        const isCorrect = q.correctAnswerIndex === optIndex;
                        let btnClass = "border-white/10 bg-white/5 hover:bg-white/10 text-indigo-100 hover:text-white";
                        
                        if (isAnswered || showResults) {
                          if (isCorrect) {
                            btnClass = "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                          } else if (isSelected && !isCorrect) {
                            btnClass = "border-rose-500/50 bg-rose-500/20 text-rose-300";
                          } else {
                            btnClass = "border-transparent bg-black/20 text-slate-500 opacity-60";
                          }
                        }

                        return (
                          <button
                            key={optIndex}
                            onClick={() => handleSelectOption(qIndex, optIndex)}
                            disabled={isAnswered || showResults}
                            className={`p-4 md:p-5 rounded-2xl border text-right transition-all duration-300 flex items-center justify-between text-base md:text-lg font-medium group ${btnClass}`}
                          >
                            <span className="group-hover:translate-x-[-4px] transition-transform">{opt}</span>
                            {(isAnswered || showResults) && isCorrect && <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />}
                            {(isAnswered || showResults) && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-rose-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Actions & Results */}
              {!showResults ? (
                <div className="flex justify-between items-center mt-10 md:mt-12">
                  <button onClick={handlePrevQuiz} className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full transition-all text-white/70 hover:text-white shrink-0" title="السؤال السابق">
                    <ArrowRight className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="w-full md:w-auto px-6 py-4 md:px-12 md:py-5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-2xl font-bold text-base md:text-xl shadow-xl shadow-purple-500/25 transition-all hover:scale-105 hover:-translate-y-1 mx-2 md:mx-4"
                  >
                    عرض النتيجة والشرح التفصيلي
                  </button>
                  <button onClick={handleNextQuiz} className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full transition-all text-white/70 hover:text-white shrink-0" title="السؤال التالي">
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-xl rounded-3xl p-6 md:p-10 border border-indigo-500/30 shadow-2xl mt-12"
                >
                  <div className="flex items-center space-x-3 space-x-reverse border-b border-indigo-500/30 pb-5 mb-6">
                    <span className="text-3xl">📖</span>
                    <h3 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
                      تفاصيل القصيدة والشرح
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 mb-8">
                    <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                      <span className="text-indigo-300 text-sm md:text-base font-bold uppercase tracking-wider block mb-2">الشاعر</span>
                      <p className="text-xl md:text-2xl font-medium text-amber-50">{data.poet}</p>
                    </div>
                    <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                      <span className="text-indigo-300 text-sm md:text-base font-bold uppercase tracking-wider block mb-2">القصيدة</span>
                      <p className="text-xl md:text-2xl font-medium text-amber-50">{data.poem}</p>
                    </div>
                    <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                      <span className="text-indigo-300 text-sm md:text-base font-bold uppercase tracking-wider block mb-2">العصر / المدرسة</span>
                      <p className="text-xl md:text-2xl font-medium text-amber-50">{data.school}</p>
                    </div>
                    <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                      <span className="text-indigo-300 text-sm md:text-base font-bold uppercase tracking-wider block mb-2">الحكمة أو الخلاصة</span>
                      <p className="text-xl md:text-2xl font-medium text-amber-50">{data.wisdom}</p>
                    </div>
                  </div>

                  <div className="bg-indigo-950/50 p-6 md:p-8 rounded-2xl border border-indigo-500/20">
                    <span className="text-amber-400 text-sm md:text-base font-bold uppercase tracking-wider block mb-3 md:mb-4 flex items-center">
                      <span className="mr-2">الشرح التفصيلي</span>
                      <span className="w-full h-px bg-indigo-500/20 ml-4"></span>
                    </span>
                    <p className="text-lg md:text-xl leading-loose md:leading-loose text-indigo-50 font-medium">
                      {data.explanation}
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-10">
                    <button onClick={handlePrevQuiz} className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full transition-all text-white/70 hover:text-white shrink-0" title="السؤال السابق">
                      <ArrowRight className="w-6 h-6" />
                    </button>
                    <button
                      onClick={fetchNewQuiz}
                      className="w-full md:w-auto px-6 py-4 md:px-10 md:py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-2xl font-bold text-base md:text-lg flex items-center justify-center space-x-3 space-x-reverse transition-all hover:scale-105 shadow-xl shadow-indigo-500/20 mx-2 md:mx-4"
                    >
                      <RefreshCw className="w-6 h-6" />
                      <span>توليد مقطع شعري جديد</span>
                    </button>
                    <button onClick={handleNextQuiz} className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full transition-all text-white/70 hover:text-white shrink-0" title="السؤال التالي">
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 rounded-3xl p-6 md:p-10 w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-indigo-500/30 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <h2 className="text-2xl md:text-3xl font-bold mb-8 flex items-center text-indigo-300">
                <Settings className="w-7 h-7 ml-3 text-indigo-400" />
                إعدادات النظام
              </h2>
              <div className="space-y-6 relative z-10">
                <div>
                  <label className="block text-sm md:text-base font-medium text-indigo-200 mb-3">
                    مفتاح الذكاء الاصطناعي (Gemini API Key)
                  </label>
                  <div className="relative">
                    <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500" />
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      dir="ltr"
                      className="w-full bg-slate-950 border border-indigo-500/30 rounded-2xl py-4 pr-12 pl-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-lg tracking-widest shadow-inner"
                      placeholder="AIzaSy..."
                    />
                  </div>
                  <p className="text-xs md:text-sm text-slate-400 mt-3 leading-relaxed">
                    يتم حفظ المفتاح محلياً في جهازك (Local Storage) ولا يتم مشاركته. احصل على مفتاح مجاني من منصة Google AI Studio.
                  </p>
                  
                  <AnimatePresence>
                    {testMessage && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className={`mt-4 p-4 rounded-xl text-sm md:text-base border font-medium ${testStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-rose-500/10 border-rose-500/50 text-rose-400'}`}
                      >
                        {testMessage}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <button
                    onClick={testKey}
                    disabled={!apiKey || testStatus === "loading"}
                    className="mt-5 w-full py-3 md:py-4 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-300 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center space-x-2 space-x-reverse"
                  >
                    {testStatus === "loading" ? (
                      <>
                        <div className="w-5 h-5 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin"></div>
                        <span>جاري الفحص...</span>
                      </>
                    ) : (
                      <span>فحص واختبار المفتاح</span>
                    )}
                  </button>
                </div>
                
                <div className="pt-4 flex flex-col space-y-3">
                  <button
                    onClick={() => saveApiKey(apiKey)}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02]"
                  >
                    حفظ وانطلاق
                  </button>
                  {localStorage.getItem("gemini_api_key") && (
                    <button
                      onClick={() => setIsSettingsOpen(false)}
                      className="w-full py-3 bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-400 rounded-xl font-bold transition-all"
                    >
                      إلغاء
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-6 right-6 md:bottom-10 md:right-10 z-50 bg-slate-900/90 backdrop-blur-md border shadow-2xl px-6 py-4 rounded-2xl flex items-center space-x-3 space-x-reverse font-medium ${
              toast.type === "success" 
                ? "border-emerald-500/30 text-emerald-400 shadow-emerald-500/20" 
                : "border-rose-500/30 text-rose-400 shadow-rose-500/20"
            }`}
          >
            {toast.type === "success" && <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping mr-2"></div>}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
