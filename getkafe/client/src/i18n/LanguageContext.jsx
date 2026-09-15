import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';
import { uzLatinToCyrillic } from './uzbekTransliteration';
import { Globe, Check } from 'lucide-react';

const LanguageContext = createContext(null);

export const LANGUAGES = [
  { code: 'uz_lat', label: "O'zbekcha (Lotin)", shortLabel: 'Lotin', flag: '🇺🇿' },
  { code: 'uz_cyr', label: 'Ўзбекча (Кирилл)', shortLabel: 'Кирилл', flag: '🇺🇿' },
  { code: 'ru', label: 'Русский', shortLabel: 'Русский', flag: '🇷🇺' },
];

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem('kafepos_lang');
      if (saved && (saved === 'uz_lat' || saved === 'uz_cyr' || saved === 'ru')) {
        return saved;
      }
    } catch (e) {}
    return 'uz_lat';
  });

  const setLang = (newLang) => {
    if (newLang === 'uz_lat' || newLang === 'uz_cyr' || newLang === 'ru') {
      setLangState(newLang);
      try {
        localStorage.setItem('kafepos_lang', newLang);
      } catch (e) {}
    }
  };

  /**
   * Translates a predefined key.
   * If key is missing, falls back to defaultText or key.
   * In uz_cyr mode, if key is not found in Cyrillic dictionary, auto-transliterates.
   */
  const t = (key, defaultText = '') => {
    const dict = translations[lang] || translations['uz_lat'];
    if (dict && dict[key] !== undefined) {
      return dict[key];
    }
    const fallback = translations['uz_lat']?.[key] || defaultText || key;
    if (lang === 'uz_cyr') {
      return uzLatinToCyrillic(fallback);
    }
    return fallback;
  };

  /**
   * For arbitrary dynamic strings (e.g. food names, category titles).
   * In uz_cyr mode, automatically converts Latin letters to Cyrillic.
   */
  const tr = (text) => {
    if (!text || typeof text !== 'string') return text;
    if (lang === 'uz_cyr') {
      return uzLatinToCyrillic(text);
    }
    return text;
  };

  const currentLanguage = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tr, languages: LANGUAGES, currentLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      lang: 'uz_lat',
      setLang: () => {},
      t: (k, d) => d || k,
      tr: (s) => s,
      languages: LANGUAGES,
      currentLanguage: LANGUAGES[0],
    };
  }
  return ctx;
}

export const useTranslation = useLanguage;

/**
 * Reusable Language Switcher Dropdown
 */
export function LanguageSwitcher({ compact = false, className = '' }) {
  const { lang, setLang, languages, currentLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = () => setIsOpen(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isOpen]);

  return (
    <div className={`relative inline-block text-left ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Tilni tanlash / Выбор языка"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-700/80 text-slate-200 hover:text-white border border-slate-700/80 text-xs font-semibold shadow transition-all active:scale-95"
      >
        <Globe className="w-3.5 h-3.5 text-sky-400" />
        <span>{currentLanguage.flag}</span>
        <span className={compact ? 'hidden sm:inline' : 'inline'}>{currentLanguage.shortLabel}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-50 py-1.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800">
            Til / Язык
          </div>
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLang(l.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
                lang === l.code
                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{l.flag}</span>
                <span>{l.label}</span>
              </div>
              {lang === l.code && <Check className="w-3.5 h-3.5 text-amber-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
