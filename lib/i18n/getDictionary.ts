import { locales } from "./config";

export async function getDictionary(locale: string) {
  if (!locales.includes(locale)) throw new Error("Invalid locale");
  return import(`../../locales/${locale}.json`).then(mod => mod.default);
}
