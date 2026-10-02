"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Heart } from "lucide-react";
import Link from "next/link";
import { PoetryData } from "@/lib/gemini";
import { motion, AnimatePresence } from "framer-motion";

export default function Favorites() {
  const [favorites, setFavorites] = useState<PoetryData[]>([]);

  useEffect(() => {
    const savedFavs = localStorage.getItem("favorites");
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {}
    }
  }, []);

  const removeFavorite = (verseText: string) => {
    const newFavs = favorites.filter(f => f.verse !== verseText);
    setFavorites(newFavs);
    localStorage.setItem("favorites", JSON.stringify(newFavs));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 md:px-8 md:py-4 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center space-x-3 space-x-reverse">
          <Link href="/">
            <button
              className="p-2 md:p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all duration-300 hover:-translate-x-1 shadow-lg"
              title="العودة"
            >
              <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-amber-100" />
            </button>
          </Link>
          <div className="flex flex-col justify-center">
            <h1 className="text-xl md:text-3xl font-extrabold text-slate-100 flex items-baseline -mt-1">
              المفضلة
              <span className="text-xs md:text-sm font-medium text-amber-200/60 mr-3">({favorites.length} أبيات)</span>
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col">
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-24 text-center space-y-6">
            <Heart className="w-24 h-24 text-slate-700" />
            <h2 className="text-2xl md:text-3xl font-bold text-slate-400">لا توجد أبيات مفضلة بعد</h2>
            <p className="text-slate-500 max-w-md text-lg">
              يمكنك إضافة الأبيات التي تعجبك إلى المفضلة من خلال النقر على رمز القلب في شاشة التحدي.
            </p>
            <Link href="/">
              <button className="mt-8 px-8 py-3 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 rounded-xl font-bold transition-all border border-indigo-500/30">
                العودة للتحدي
              </button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col space-y-6">
            <AnimatePresence>
              {favorites.map((data, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-slate-900/95 border border-slate-800/80 backdrop-blur-2xl rounded-3xl p-6 shadow-xl relative overflow-hidden group flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6 md:space-x-reverse"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all duration-700 group-hover:scale-150"></div>
                  
                  <button 
                    onClick={() => removeFavorite(data.verse)}
                    className="md:absolute top-4 left-4 z-40 p-2 rounded-full hover:bg-white/10 transition-colors bg-white/5 border border-white/10 self-end md:self-auto shrink-0"
                    title="إزالة من المفضلة"
                  >
                    <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                  </button>

                  <div className="flex-1 w-full flex flex-col justify-center">
                    <h2 className="relative text-xl md:text-2xl font-bold text-right md:text-center leading-relaxed text-amber-50 py-2 md:py-4 font-serif whitespace-pre-line drop-shadow-md">
                      "{data.verse.replace(/\\n/g, '\n')}"
                    </h2>
                    
                    <div className="relative border-t border-white/10 pt-4 mt-2 flex flex-wrap items-center justify-between text-xs md:text-sm font-bold tracking-wide gap-y-2">
                      <span className="text-right flex-1 min-w-[30%] text-teal-300">{data.poet}</span>
                      <span className="text-center flex-1 min-w-[30%] text-amber-400">
                        {data.poem.split(' ').length > 4 ? data.poem.split(' ').slice(0, 4).join(' ') + '...' : data.poem}
                      </span>
                      <span className="text-left flex-1 min-w-[30%] text-fuchsia-300">{data.school}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
