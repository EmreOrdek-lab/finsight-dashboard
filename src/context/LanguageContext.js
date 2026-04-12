import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANGUAGE, getLocaleFromLanguage, translations } from '../i18n/translations';

const STORAGE_KEY = 'finsight-language';

const getValueByPath = (dictionary, path) => {
    return path.split('.').reduce((current, part) => current?.[part], dictionary);
};

const interpolate = (template, params) => {
    if(typeof template !== 'string'){
        return template;
    }

    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return Object.prototype.hasOwnProperty.call(params, key) ? params[key] : match;
    });
};

const LanguageContext = createContext({
    language: DEFAULT_LANGUAGE,
    locale: getLocaleFromLanguage(DEFAULT_LANGUAGE),
    setLanguage: () => {},
    t: (key) => key,
});

export function LanguageProvider({ children }) {
    const [ language, setLanguage ] = useState(() => {
        const savedLanguage = window.localStorage.getItem(STORAGE_KEY);
        return savedLanguage === 'tr' || savedLanguage === 'en' ? savedLanguage : DEFAULT_LANGUAGE;
    });

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY, language);
        document.documentElement.lang = getLocaleFromLanguage(language);
    }, [language]);

    const value = useMemo(() => {
        const locale = getLocaleFromLanguage(language);

        return {
            language,
            locale,
            setLanguage,
            t: (key, params = {}) => {
                const currentDictionary = translations[language] || translations[DEFAULT_LANGUAGE];
                const fallbackDictionary = translations[DEFAULT_LANGUAGE];
                const template = getValueByPath(currentDictionary, key) ?? getValueByPath(fallbackDictionary, key) ?? key;
                return interpolate(template, params);
            },
        };
    }, [language]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => useContext(LanguageContext);
