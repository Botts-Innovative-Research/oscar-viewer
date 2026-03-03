"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import ar from '../locales/ar.json';
import ru from '../locales/ru.json';
import zhCN from '../locales/zh-CN.json';
import ja from '../locales/ja.json';
import ko from '../locales/ko.json';
import arJO from '../locales/ar-JO.json';
import lv from '../locales/lv.json';
import et from '../locales/et.json';
import pt from '../locales/pt.json';
import de from '../locales/de.json';
import th from '../locales/th.json';
import hi from '../locales/hi.json';
import bn from '../locales/bn.json';
import paPK from '../locales/pa-PK.json';
import vi from '../locales/vi.json';
import yue from '../locales/yue.json';
import tr from '../locales/tr.json';
import id from '../locales/id.json';
import ur from '../locales/ur.json';
import it from '../locales/it.json';

type Locale = 'en' | 'es' | 'fr' | 'ar' | 'ru' | 'zh-CN' | 'ja' | 'ko' | 'ar-JO' | 'lv' | 'et' | 'pt' | 'de' | 'th' | 'hi' | 'bn' | 'pa-PK' | 'vi' | 'yue' | 'tr' | 'id' | 'ur' | 'it';
type Direction = 'ltr' | 'rtl';
type Translations = Record<string, string>;

const translations: Record<Locale, Translations> = {
  en, es, fr, ar, ru, 'zh-CN': zhCN, ja, ko, 'ar-JO': arJO, lv, et, pt, de, th, hi, bn, 'pa-PK': paPK, vi, yue, tr, id, ur, it
};

const rtlLocales: Locale[] = ['ar', 'ar-JO', 'pa-PK', 'ur'];

interface LanguageContextProps {
  language: Locale;
  direction: Direction;
  setLanguage: (lang: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Locale>('en');
  const [direction, setDirection] = useState<Direction>('ltr');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Locale;
    if (savedLanguage && translations[savedLanguage]) {
      setLanguageState(savedLanguage);
      const dir = rtlLocales.includes(savedLanguage) ? 'rtl' : 'ltr';
      setDirection(dir);
      document.documentElement.dir = dir;
      document.documentElement.lang = savedLanguage;
    }
    setIsLoaded(true);
  }, []);

  const setLanguage = (lang: Locale) => {
    setLanguageState(lang);
    const dir = rtlLocales.includes(lang) ? 'rtl' : 'ltr';
    setDirection(dir);
    localStorage.setItem('language', lang);
    // Update document direction immediately for better UX
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  };

  const t = (key: string) => {
      // Fallback to English if translation is missing
      return translations[language][key] || translations['en'][key] || key;
  };

  if (!isLoaded) {
      // Optional: Render nothing or a loader until we know the language preference
      // returning children immediately would cause a hydration mismatch if server renders 'en' and client renders 'es'
      return null;
  }

  return (
    <LanguageContext.Provider value={{ language, direction, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
