"use client";

import { ChatInterface } from "../components/chat-interface";
import { Sparkles } from "lucide-react";

export default function Page() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 md:p-8 space-y-12">
      {/* Hero Section */}
      <div className="max-w-3xl w-full text-center space-y-6 animate-in fade-in slide-in-from-top-4 duration-1000">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          Next-Gen AI Platform
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-zinc-900 dark:text-white tracking-tight leading-tight">
          Supercharge your workflow with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Gemini</span>
        </h1>

        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Experience the power of Google's most capable AI models directly in your browser.
          Fast, intelligent, and designed for modern teams.
        </p>
      </div>

      {/* Chat Section */}
      <div className="w-full max-w-4xl animate-in fade-in zoom-in duration-700 [animation-delay:200ms]">
        <ChatInterface />
      </div>

      {/* Footer / Context */}
      <div className="text-zinc-400 dark:text-zinc-600 text-[10px] font-bold uppercase tracking-[0.2em] animate-in fade-in duration-1000 [animation-delay:1000ms]">
        Built with Vercel AI SDK & Next.js 16
      </div>

      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
      </div>
    </main>
  );
}
