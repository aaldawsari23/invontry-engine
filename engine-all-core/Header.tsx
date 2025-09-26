
import React from 'react';
import { useTranslation } from './I18n';

export const Header: React.FC = () => {
    const { t, setLanguage, language } = useTranslation();

    const toggleLanguage = () => {
        const newLang = language === 'en' ? 'ar' : 'en';
        setLanguage(newLang);
    };

    return (
        <header className="relative text-center py-12 overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 opacity-50"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-blue-500/5"></div>
            
            {/* Decorative elements */}
            <div className="absolute top-0 left-1/4 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
                {/* Language Toggle */}
                <div className="absolute top-0 right-0 sm:right-4">
                    <button
                        onClick={toggleLanguage}
                        className="group relative bg-slate-800/80 backdrop-blur-sm text-white font-semibold py-2.5 px-4 rounded-xl border border-slate-600 hover:border-teal-400 transition-all duration-300 hover:shadow-lg hover:shadow-teal-400/25"
                        aria-label={t('toggle_language_aria')}
                    >
                        <span className="relative z-10">
                            {language === 'en' ? 'عربي' : 'English'}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-blue-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </button>
                </div>

                {/* Main Title */}
                <div className="space-y-4">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-white tracking-tight">
                        {t('header_title')}
                    </h1>
                    
                    {/* Subtitle */}
                    <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        {t('header_subtitle')}
                    </p>
                    
                    {/* Decorative line */}
                    <div className="flex items-center justify-center mt-8">
                        <div className="h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent w-32"></div>
                        <div className="w-2 h-2 bg-teal-400 rounded-full mx-4 animate-pulse"></div>
                        <div className="h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent w-32"></div>
                    </div>
                </div>
            </div>
        </header>
    );
};
