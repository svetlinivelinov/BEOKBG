# BG-EN Localization Notes

Този документ описва реалното състояние на BG/EN локализацията в проекта.

## 1. Активна структура

- /app/[locale] съдържа всички активни страници
- /locales/bg.json и /locales/en.json съдържат UI речниците
- /lib/i18n/config.ts дефинира активните езици и default locale
- /lib/i18n/getDictionary.ts зарежда речника динамично
- /lib/products/getProducts.ts обединява базови продуктови данни + локализирано съдържание

## 2. Как работи локализацията

- UI текстовете идват от /locales/*.json
- Продуктовото съдържание не е в /locales, а в /data/products/content.*.json
- /data/products/content.en.json е fallback източник
- Ако поле липсва в bg, системата взема стойността от en

## 3. Продуктов модел

Базов модел в /data/products/products.json:
- id
- model
- category
- application (electric, water, gas-boiler)
- image
- sourceUrls
- sourceNote

Локализирано съдържание в /data/products/content.en.json и /data/products/content.bg.json:
- name
- description
- keyFeatures[]
- technicalData[]

## 4. Locale-aware навигация

- Пътища: /bg/... и /en/...
- LanguageSwitcher пази query параметрите при смяна на език
- Това позволява да се запазят category/application филтри между BG и EN

## 5. Филтри в продуктовата страница

- Category филтър: чрез query параметър category
- Application филтър: чрез query параметър application
- Application филтърът се показва само за релевантни категории

## 6. Когато добавяш нов продукт

1. Добави базов запис в /data/products/products.json
2. Добави EN съдържание в /data/products/content.en.json
3. Добави BG съдържание в /data/products/content.bg.json
4. Добави изображение в /public/images/products (ако има)
5. Провери /bg/products и /en/products

## 7. Когато добавяш нов UI ключ

1. Добави ключа в /lib/i18n/types.ts
2. Добави стойности и в двата речника:
   - /locales/bg.json
   - /locales/en.json
3. Използвай ключа през getDictionary в страницата/компонента

## 8. Забележки

- Legacy /pages кодът е архивиран и не е активен.
- next.config.js не дефинира i18n блок; локализацията е реализирана чрез сегмент [locale] в App Router.
