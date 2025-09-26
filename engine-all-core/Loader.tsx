
import React, { useState, useEffect } from 'react';
import { useTranslation } from './I18n';

const loadingMessages: Record<string, string[]> = {
    en: [
        "Initializing analysis engine...",
        "Parsing inventory data...",
        "Applying classification rules...",
        "Scoring items for relevance...",
        "Identifying strong PT signals...",
        "Checking for diagnostic blockers...",
        "Compiling results...",
        "Finalizing report...",
    ],
    ar: [
        "تهيئة محرك التحليل...",
        "تحليل بيانات المخزون...",
        "تطبيق قواعد التصنيف...",
        "تقييم الأصناف حسب الأهمية...",
        "تحديد الإشارات القوية للعلاج الطبيعي...",
        "التحقق من المعوقات التشخيصية...",
        "تجميع النتائج...",
        "وضع اللمسات الأخيرة على التقرير...",
    ]
};


export const Loader: React.FC<{progress: number}> = ({ progress }) => {
    const { t, language } = useTranslation();
    const [messageIndex, setMessageIndex] = useState(0);

    const messages = loadingMessages[language] || loadingMessages.en;

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex(prevIndex => (prevIndex + 1) % messages.length);
        }, 1200);
        return () => clearInterval(interval);
    }, [messages]);

    return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 max-w-lg mx-auto shadow-2xl">
            {/* Enhanced Spinner */}
            <div className="relative mb-8">
                <div className="w-20 h-20 border-4 border-slate-700 rounded-full"></div>
                <div className="absolute top-0 left-0 w-20 h-20 border-4 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute top-2 left-2 w-16 h-16 border-2 border-slate-600 border-t-teal-300 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
            </div>
            
            {/* Title with Animation */}
            <h2 className="text-2xl font-bold text-white mb-4 animate-pulse">
                {t('loader_analyzing')}
            </h2>
            
            {/* Status Message */}
            <div className="min-h-[60px] flex items-center justify-center mb-6">
                <p className="text-slate-300 text-center max-w-md transition-all duration-500 ease-in-out">
                    {messages[messageIndex]}
                </p>
            </div>
            
            {/* Enhanced Progress Bar */}
            <div className="w-full max-w-md">
                <div className="flex justify-between text-sm text-slate-400 mb-2">
                    <span>Progress</span>
                    <span className="font-mono">{progress}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div 
                        className="h-3 rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-teal-500 to-teal-400 shadow-lg"
                        style={{
                            width: `${progress}%`,
                            boxShadow: progress > 0 ? '0 0 10px rgba(45, 212, 191, 0.5)' : 'none'
                        }}
                    ></div>
                </div>
            </div>
            
            {/* Animated Dots */}
            <div className="flex space-x-1 mt-6">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"
                        style={{
                            animationDelay: `${i * 0.2}s`,
                            animationDuration: '1s'
                        }}
                    ></div>
                ))}
            </div>
        </div>
    );
};
