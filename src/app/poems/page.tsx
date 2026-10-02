"use client";

import { useState, useMemo } from "react";
import { ArrowRight, Search, ChevronDown, BookOpen } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import offlineData from "@/data/offlineData.json";
import { PoetryData } from "@/lib/gemini";

interface GroupedPoem {
  title: string;
  poet: string;
  school: string;
  verses: string[];
}

export default function PoemsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const poemsArray = useMemo(() => {
    const grouped = (offlineData as PoetryData[]).reduce((acc, current) => {
      // Treat missing/undefined poem titles as "بدون عنوان"
      const title = current.poem || "بدون عنوان";
      if (!acc[title]) {
        acc[title] = {
          poet: current.poet || "غير معروف",
          school: current.school || "",
          verses: []
        };
      }
      if (!acc[title].verses.includes(current.verse)) {
        acc[title].verses.push(current.verse);
      }
      return acc;
    }, {} as Record<string, { poet: string, school: string, verses: string[] }>);

    return Object.entries(grouped)
      .map(([title, data]) => ({ title, ...data }))
      .sort((a, b) => a.title.localeCompare(b.title, 'ar'));
  }, []);

  const filteredPoems = useMemo(() => {
    if (!searchQuery.trim()) return poemsArray;
    const query = searchQuery.toLowerCase();
    return poemsArray.filter(
      p => p.title.toLowerCase().includes(query) || p.poet.toLowerCase().includes(query)
    );
  }, [poemsArray, searchQuery]);

  const toggleAccordion = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="flex flex-col px-4 py-3 md:px-8 md:py-4 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-40 gap-y-4 shadow-lg shadow-black/20">
        <div className="flex items-center space-x-3 space-x-reverse">
          <Link href="/">
            <button
              className="p-1.5 md:p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all duration-300 hover:-translate-x-1 shadow-sm shrink-0"
              title="العودة"
            >
              <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-amber-100" />
            </button>
          </Link>
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <h1 className="text-lg md:text-2xl font-extrabold text-slate-100 flex items-baseline">
              القصائد المجمعة
              <span className="text-[10px] md:text-xs font-medium text-amber-200/60 mr-2">({poemsArray.length} قصيدة)</span>
            </h1>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full max-w-2xl mx-auto">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="ابحث باسم القصيدة أو الشاعر..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-indigo-500/30 rounded-2xl py-3 pr-12 pl-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 md:px-8 py-8 flex flex-col space-y-4">
        {filteredPoems.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-12 text-center space-y-4">
            <span className="text-5xl">🔍</span>
            <h2 className="text-xl font-bold text-slate-400">لا توجد نتائج مطابقة لبحثك</h2>
          </div>
        ) : (
          filteredPoems.map((poem, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <div 
                key={index} 
                className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg transition-all"
              >
                {/* Accordion Header */}
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full px-5 py-4 flex items-center justify-between bg-slate-900 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex flex-col items-start text-right space-y-1">
                    <h3 className="text-base md:text-lg font-bold text-amber-50">
                      {poem.title}
                    </h3>
                    <span className="text-xs md:text-sm font-medium text-teal-400">
                      {poem.poet} {poem.school && <><span className="text-slate-500 mx-1">|</span> <span className="text-fuchsia-400/70">{poem.school}</span></>}
                    </span>
                  </div>
                  <div className={`p-2 rounded-full bg-white/5 transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5 text-indigo-300" />
                  </div>
                </button>

                {/* Accordion Body */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="border-t border-slate-800/80"
                    >
                      <div className="p-5 md:p-8 bg-slate-950/50 space-y-6">
                        {poem.verses.map((verse, vIndex) => (
                          <div key={vIndex} className="relative">
                            {vIndex > 0 && <div className="w-12 h-px bg-white/5 mx-auto mb-6"></div>}
                            <p className="text-lg md:text-2xl font-serif leading-loose md:leading-loose text-center text-indigo-50 whitespace-pre-line drop-shadow-sm">
                              {verse.replace(/\\n/g, '\n')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
