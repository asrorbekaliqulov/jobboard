import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en/translation.json';
import ru from './locales/ru/translation.json';
import uz from './locales/uz/translation.json';

// Language is set from backend user.language after login (see App.tsx)
// Browser detection is used as initial fallback before login completes

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            ru: { translation: ru },
            uz: { translation: uz },
        },
        fallbackLng: 'uz',
        supportedLngs: ['en', 'ru', 'uz'],
        debug: false,
        interpolation: {
            escapeValue: false, // React already safe from xss
        },
        detection: {
            order: ['querystring', 'localStorage', 'navigator'],
            lookupQuerystring: 'lang',
            caches: ['localStorage'],
        }
    });

export default i18n;
