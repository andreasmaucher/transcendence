import en from "./en";
import de from "./de";
import fr from "./fr";

type Language = "en" | "de" | "fr";
const translations: Record<Language, any> = {
  en,
  de,
  fr,
};

let currentLanguage: Language = "en";

function getNestedValue(obj: any, path: string): any 
{
  const parts = path.split(".");
  let current: any = obj;

  for (const part of parts) {
    if (current[part] === undefined) {
      return path;
    }
    current = current[part];
  }
  return current;
}

export function t(key: string): any 
{
  return getNestedValue(translations[currentLanguage], key);
}

export function setLanguage(lang: Language) 
{
  currentLanguage = lang;
  localStorage.setItem("language", lang);

  // Update <html lang="">
  document.documentElement.lang = lang;
}

export function getLanguage(): Language {
  return currentLanguage;
}

(function init() {
  const stored = localStorage.getItem("language") as Language | null;
  if (stored && translations[stored]) {
    setLanguage(stored);
    return;
  }

  const browser = navigator.language.slice(0, 2) as Language;
  if (browser === "de" || browser === "fr") {
    setLanguage(browser);
  } else {
    setLanguage("en");
  }
})();
