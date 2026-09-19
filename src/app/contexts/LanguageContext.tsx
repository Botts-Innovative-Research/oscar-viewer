"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from '../../locales/en.json';
import es from '../../locales/es.json';
import fr from '../../locales/fr.json';
import el from '../../locales/el.json';

export type Locale = 'en' | 'es' | 'fr' | 'el';
type Translations = Record<string, string>;
type TranslationParams = Record<string, string | number>;

const translations: Record<Locale, Translations> = {
  en,
  es,
  fr,
  el,
};

interface LanguageContextProps {
  language: Locale;
  setLanguage: (lang: Locale) => void;
  t: (key: string, params?: TranslationParams) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

const persistLanguage = (lang: Locale) => {
  localStorage.setItem('language', lang);
  document.cookie = `osh-language=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
  document.documentElement.lang = lang;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Locale>('en');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const cookieLanguage = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith('osh-language='))
      ?.split('=')[1] as Locale | undefined;
    const savedLanguage = (localStorage.getItem('language') || cookieLanguage) as Locale;
    const initialLanguage = savedLanguage && translations[savedLanguage] ? savedLanguage : 'en';
    setLanguageState(initialLanguage);
    persistLanguage(initialLanguage);
    setIsLoaded(true);
  }, []);

  const setLanguage = (lang: Locale) => {
    setLanguageState(lang);
    persistLanguage(lang);
  };

  const t = (key: string, params: TranslationParams = {}) => {
    const template = translations[language][key] || translations.en[key] || key;
    return Object.entries(params).reduce(
      (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
      template,
    );
  };

  if (!isLoaded) {
      // Optional: Render nothing or a loader until we know the language preference
      // returning children immediately would cause a hydration mismatch if server renders 'en' and client renders 'es'
      return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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
