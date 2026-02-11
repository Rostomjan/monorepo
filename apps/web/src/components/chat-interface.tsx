"use client";

import { useChat } from "@ai-sdk/react";
import { Send, User, Bot, Sparkles, Loader2, ArrowDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function ChatInterface() {
    const [input, setInput] = useState("");
    const { messages, sendMessage, status } = useChat();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [shouldShowScroll, setShouldShowScroll] = useState(false);

    const isLoading = status === "streaming" || status === "submitted";

    useEffect(() => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100;
            if (isAtBottom) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }
    }, [messages]);

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            setShouldShowScroll(scrollHeight - scrollTop > clientHeight + 200);
        }
    };

    const scrollToBottom = () => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    };

    return (
        <div className="flex flex-col h-[650px] w-full max-w-2xl mx-auto border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl shadow-2xl transition-all duration-500 hover:shadow-blue-500/10 dark:hover:shadow-blue-900/10 ring-1 ring-zinc-200 dark:ring-zinc-800">
            {/* Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-900 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25 rotate-3">
                            <Sparkles className="w-6 h-6 text-white animate-pulse" />
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 shadow-sm"></span>
                    </div>
                    <div>
                        <h2 className="font-bold text-zinc-900 dark:text-zinc-100 tracking-tight text-lg">Gemini Intelligence</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Flash 3.0 • Online</span>
                        </div>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-2">
                    <div className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-500">Premium AI</div>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth scrollbar-none relative"
            >
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-700">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center shadow-inner ring-1 ring-zinc-100 dark:ring-zinc-800 rotate-6 hover:rotate-0 transition-transform duration-500">
                            <Bot className="w-10 h-10 text-blue-500" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-zinc-900 dark:text-zinc-100 font-bold text-xl tracking-tight">How can I assist you today?</p>
                            <p className="text-sm text-zinc-500 max-w-[280px] mx-auto leading-relaxed">
                                Experience the future of conversation with Google&apos;s most capable language models.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 w-full max-w-sm pt-4">
                            {["What's the weather?", "Write a poem", "Explain quantum", "Code a button"].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => sendMessage({ text: suggestion })}
                                    className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((m) => {
                    const content = m.parts?.find(p => p.type === 'text')?.type === 'text'
                        ? (m.parts.find(p => p.type === 'text') as any).text
                        : (m as any).content || (m as any).text || '';

                    return (
                        <div
                            key={m.id}
                            className={`flex items-start gap-4 group animate-in slide-in-from-bottom-4 duration-500 ${m.role === "user" ? "flex-row-reverse" : "flex-row"
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-transform group-hover:scale-105 ${m.role === "user"
                                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                                : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                                }`}>
                                {m.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                            </div>

                            <div className={`flex flex-col max-w-[85%] ${m.role === "user" ? "items-end" : "items-start"}`}>
                                <div
                                    className={`px-5 py-3.5 rounded-3xl text-sm leading-relaxed tracking-wide shadow-sm hover:shadow-md transition-shadow ${m.role === "user"
                                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium rounded-tr-none"
                                        : "bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-tl-none border border-zinc-200/50 dark:border-zinc-800/50"
                                        }`}
                                >
                                    {content}
                                </div>
                                <div className={`flex items-center gap-2 mt-2 px-1`}>
                                    <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                                        {m.role === "user" ? "You" : "Gemini"}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                                    <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap">Just now</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {isLoading && (
                    <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                            <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-900 px-5 py-3.5 rounded-3xl rounded-tl-none border border-zinc-200/50 dark:border-zinc-800/50 min-w-[60px] flex items-center justify-center shadow-sm">
                            <div className="flex gap-1.5">
                                <span className="w-2 h-2 bg-blue-500/40 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-blue-500/60 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                <span className="w-2 h-2 bg-blue-500/80 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                            </div>
                        </div>
                    </div>
                )}

                {shouldShowScroll && (
                    <button
                        onClick={scrollToBottom}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all z-20 text-zinc-500 hover:text-blue-500"
                    >
                        <ArrowDown className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Input */}
            <div className="p-6 pt-2 border-t border-zinc-100 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md">
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        if (!input.trim() || isLoading) return;
                        const currentInput = input;
                        setInput("");
                        await sendMessage({ text: currentInput });
                    }}
                    className="relative group"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className="relative flex items-center">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Message Gemini Intelligence..."
                            className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-6 py-4 pr-16 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-900 outline-none transition-all placeholder:text-zinc-500 dark:text-zinc-400 shadow-sm"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="absolute right-3 p-2 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-30 disabled:hover:scale-100 text-white dark:text-zinc-900 rounded-xl transition-all duration-300 hover:shadow-lg active:scale-95 group-hover:rotate-0"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </form>
                <div className="mt-4 flex items-center justify-between px-2">
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">
                        Gemini 3.0 Experimental
                    </p>
                    <div className="flex gap-4">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase cursor-pointer hover:text-zinc-600 transition-colors">Privacy</span>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase cursor-pointer hover:text-zinc-600 transition-colors">Terms</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
