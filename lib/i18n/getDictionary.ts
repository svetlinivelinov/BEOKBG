import { locales } from "./config";
import { Dictionary } from "./types";

export async function getDictionary(locale: string): Promise<Dictionary> {
  if (!locales.includes(locale)) throw new Error("Invalid locale");
  return import(`../../locales/${locale}.json`).then(mod => mod.default as Dictionary);
}
