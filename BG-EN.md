Пълна i18n структура за Next.js (App Router)
📁 1. Файлова структура
/app
  /[locale]
    /layout.tsx
    /page.tsx
    /products
      /page.tsx
      /[slug]
        /page.tsx
    /categories
      /page.tsx
      /[slug]
        /page.tsx
    /api
      /orders
      /pickpack
/locales
  /bg.json
  /en.json
/lib
  /i18n
    /config.ts
    /getDictionary.ts
    /types.ts



📌 2. next.config.js – активиране на i18n
/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    locales: ["bg", "en"],
    defaultLocale: "bg",
  },
};

module.exports = nextConfig;



📌 3. /lib/i18n/config.ts
export const i18n = {
  defaultLocale: "bg",
  locales: ["bg", "en"],
} as const;

export type Locale = (typeof i18n)["locales"][number];



📌 4. /lib/i18n/getDictionary.ts
import "server-only";
import { Locale } from "./config";

const dictionaries = {
  bg: () => import("../../locales/bg.json").then((m) => m.default),
  en: () => import("../../locales/en.json").then((m) => m.default),
};

export async function getDictionary(locale: Locale) {
  return dictionaries[locale]();
}



📌 5. /lib/i18n/types.ts
export interface Dictionary {
  hero_title: string;
  hero_subtitle: string;
  products: string;
  categories: string;
  contact: string;
  // добавяй ключове според нуждите
}



📌 6. /locales/bg.json
{
  "hero_title": "Умни термостати за всеки дом",
  "hero_subtitle": "Контролирай отоплението лесно и удобно",
  "products": "Продукти",
  "categories": "Категории",
  "contact": "Контакти"
}



📌 7. /locales/en.json
{
  "hero_title": "Smart thermostats for every home",
  "hero_subtitle": "Control your heating easily and conveniently",
  "products": "Products",
  "categories": "Categories",
  "contact": "Contact"
}



📌 8. /app/[locale]/layout.tsx
import { ReactNode } from "react";
import { i18n, Locale } from "@/lib/i18n/config";

export function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: Locale };
}) {
  return (
    <html lang={params.locale}>
      <body>{children}</body>
    </html>
  );
}



📌 9. /app/[locale]/page.tsx (пример за Home)
import { getDictionary } from "@/lib/i18n/getDictionary";
import { Locale } from "@/lib/i18n/config";
import Hero from "@/components/Hero";

export default async function HomePage({
  params,
}: {
  params: { locale: Locale };
}) {
  const dict = await getDictionary(params.locale);

  return (
    <main>
      <Hero
        title={dict.hero_title}
        subtitle={dict.hero_subtitle}
        locale={params.locale}
      />
    </main>
  );
}



📌 10. Пример компонент: Hero.tsx
interface HeroProps {
  title: string;
  subtitle: string;
  locale: string;
}

export default function Hero({ title, subtitle }: HeroProps) {
  return (
    <section className="py-20 text-center bg-gray-100">
      <h1 className="text-4xl font-bold">{title}</h1>
      <p className="text-lg mt-4 text-gray-600">{subtitle}</p>
    </section>
  );
}



📌 11. Динамични маршрути за продукти
/app/[locale]/products/[slug]/page.tsx
import { getDictionary } from "@/lib/i18n/getDictionary";
import { Locale } from "@/lib/i18n/config";

export default async function ProductPage({
  params,
}: {
  params: { locale: Locale; slug: string };
}) {
  const dict = await getDictionary(params.locale);

  // TODO: fetch product from DB
  // const product = await getProduct(params.slug);

  return (
    <div>
      <h1>{/* product.name */}</h1>
      <p>{/* product.description */}</p>
    </div>
  );
}



📌 12. Language Switcher компонент
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function LanguageSwitcher() {
  const pathname = usePathname();

  const pathWithoutLocale = pathname.replace(/^\/(bg|en)/, "");

  return (
    <div className="flex gap-4">
      <Link href={`/bg${pathWithoutLocale}`}>BG</Link>
      <Link href={`/en${pathWithoutLocale}`}>EN</Link>
    </div>
  );
}



🎯 Финален резултат
С тази структура получаваш:
- истинска i18n система
- динамични продукти и категории
- SEO‑friendly URL-и
- лесно разширяване
- лесна интеграция с админ панел
- лесна интеграция с база данни
- лесна интеграция с API
Това е enterprise ниво, много по‑добро от Beok.
