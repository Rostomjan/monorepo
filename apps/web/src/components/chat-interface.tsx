"use client";

import { useChat } from "@ai-sdk/react";
import { Send, User, Bot, Sparkles, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function ChatInterface() {
    const [input, setInput] = useState("");
    const { messages, sendMessage, status } = useChat();
    const scrollRef = useRef<HTMLDivElement>(null);

    const isLoading = status === "streaming" || status === "submitted";

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const currentInput = input;
        setInput("");
        await sendMessage({ text: currentInput });
    };

    return (
        <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-950 shadow-2xl transition-all duration-300 hover:shadow-zinc-200/50 dark:hover:shadow-zinc-900/50">
            {/* Header */}
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Sparkles className="w-5 h-5 text-white animate-pulse" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Gemini Assistant</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-xs text-zinc-500 font-medium">Always active</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800"
            >
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in duration-500">
                        <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-zinc-400 dark:text-zinc-600" />
                        </div>
                        <div>
                            <p className="text-zinc-900 dark:text-zinc-100 font-medium">How can I help you today?</p>
                            <p className="text-sm text-zinc-500 max-w-[240px] mt-1">Start a conversation with our Gemini-powered AI.</p>
                        </div>
                    </div>
                )}

                {messages.map((m) => {
                    const textPart = m.parts.find(p => p.type === 'text');
                    const content = textPart?.type === 'text' ? textPart.text : '';

                    return (
                        <div
                            key={m.id}
                            className={`flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-300 ${m.role === "user" ? "flex-row-reverse" : "flex-row"
                                }`}
                        >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${m.role === "user"
                                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                                : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                }`}>
                                {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>

                            <div className={`flex flex-col max-w-[80%] ${m.role === "user" ? "items-end" : "items-start"}`}>
                                <div
                                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role === "user"
                                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium rounded-tr-none shadow-md"
                                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-tl-none border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm"
                                        }`}
                                >
                                    {content}
                                </div>
                                <span className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider font-bold">
                                    {m.role === "user" ? "You" : "Gemini"}
                                </span>
                            </div>
                        </div>
                    );
                })}
                {isLoading && (
                    <div className="flex items-center gap-3 animate-in fade-in duration-300">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                        <div className="bg-zinc-100 dark:bg-zinc-900 px-4 py-2.5 rounded-2xl rounded-tl-none border border-zinc-200/50 dark:border-zinc-800/50">
                            <div className="flex gap-1.5">
                                <span className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-600 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                <span className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950">
                <div className="relative flex items-center">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow placeholder:text-zinc-500 dark:text-zinc-200"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 p-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white rounded-lg transition-all duration-200 active:scale-95 shadow-sm"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-[10px] text-center text-zinc-400 mt-3 font-medium uppercase tracking-[0.1em]">
                    Powered by Google Gemini 1.5 Pro
                </p>
            </form>
        </div>
    );
}
