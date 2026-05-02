import { locales, defaultLocale } from "./config";

export async function getDictionary(locale: string) {
  const safe = locales.includes(locale) ? locale : defaultLocale;
  return import(`../../locales/${safe}.json`).then(mod => mod.default);
}
