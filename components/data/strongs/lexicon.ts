export interface StrongsEntry {
  id: string;
  original: string;
  transliteration?: string;
  pronunciation?: string;
  definitionAr?: string;
  definitionEn: string;
  kjvDefinition?: string;
}

let cachedLexicon: Record<string, StrongsEntry> | null = null;
let cachedArabicOverrides: Record<string, string> | null = null;

const getLexicon = () => {
  if (!cachedLexicon) {
    cachedLexicon = require('./generatedLexicon.json') as Record<
      string,
      StrongsEntry
    >;
  }

  return cachedLexicon;
};

const getArabicOverrides = () => {
  if (!cachedArabicOverrides) {
    cachedArabicOverrides = require('./arabicOverrides.json') as Record<
      string,
      string
    >;
  }

  return cachedArabicOverrides;
};

export const getStrongsEntry = (strongId: string) => {
  const entry = getLexicon()[strongId];
  const definitionAr = getArabicOverrides()[strongId];

  if (!entry || !definitionAr) {
    return entry;
  }

  return { ...entry, definitionAr };
};
