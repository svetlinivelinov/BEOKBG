# eMAG Integration: Extra Product Information (Supplement)

This document lists the additional product information and mapping logic that was implemented in BEOKBG to complete eMAG product onboarding, beyond the standard process documentation.

## Purpose

The eMAG listing wizard required additional attributes (characteristics, family grouping, warranty, dimensions, etc.) that were not fully covered by the original process documentation.  
These values are now prepared and sent automatically by the integration where possible.

## Product fields now sent to eMAG

For each product offer, the integration sends:

- Product identity:
  - `id` (stable internal numeric id derived from local product id)
  - `name` (model)
  - `part_number` (model)
  - `category_id`
  - `source_language`
- Commercial:
  - `sale_price`
  - `min_sale_price`
  - `max_sale_price`
  - `recommended_price` (optional, when configured)
  - `currency_type`
  - `stock` (warehouse + quantity)
  - `handling_time`
  - `vat_id`
  - `warranty` (when configured)
- Content:
  - `url` (product URL on seller website)
  - `description`
  - `brand`
  - `ean` (array of strings; single values are wrapped)
  - `images`
- Characteristics:
  - category characteristic array (`id`, `value`)
- Family (variants):
  - `family.id`
  - `family.name`
  - `family_type_id` (when available)
- Measurements:
  - `weight`, `width`, `height`, `length` (via measurements endpoint)

## Characteristic IDs currently used

### Basic characteristics (thermostat categories)

- `5704` → Product type (example: `Термостат`)
- `8434` → Usage (example: `Вътрешна употреба`)
- `9645` → Suitable for:
  - `electric` → `Електрическо подово отопление`
  - `water` → `Водно подово отопление`
  - `gas-boiler` → `Газов котел`
- `7597` → Compatible brand (example: `BEOK`)

### Color characteristic

- `5401` → Color (auto-filled if configured/inferred)

## Auto family grouping (variant families)

Family grouping can be configured explicitly or inferred from model suffixes (`-EP`, `-WP`, `-WPB`, `-NR`).

Current inferred family ids:

- `BOT-R7X-WIFI` → `7119562`
- `TCC31-WIFI` → `11414053`
- `TGM50-WIFI` → `11223957`
- `TGM50B-WIFI` → `4063816`
- `TGR85-WIFI` → `10860939`

## Environment variables added/used

- `EMAG_CHARACTERISTICS_MAP_JSON`  
  JSON map of category characteristics sent during product sync.
- `EMAG_FAMILY_MAP_JSON`  
  Explicit family mapping per product id/model, including optional color.
- `EMAG_PRODUCT_ID_MAP_JSON`  
  Optional explicit numeric eMAG ID mapping keyed by local product id/model.
- `EMAG_ENABLE_AUTO_FAMILY`  
  `1` enables automatic family inference from model suffixes.
- `EMAG_FAMILY_TYPE_ID`  
  Family type id used when auto-family is enabled (default: `1`).
- `EMAG_COLOR_CHARACTERISTIC_ID`  
  Characteristic id for color (default: `5401`).
- `EMAG_WARRANTY_MONTHS`  
  Default warranty in months for offers.
- `EMAG_MIN_SALE_PRICE_FACTOR`  
  Multiplier for `min_sale_price` (default `0.9`).
- `EMAG_MAX_SALE_PRICE_FACTOR`  
  Multiplier for `max_sale_price` (default `1.1`).
- `EMAG_RECOMMENDED_PRICE_FACTOR`  
  Optional multiplier for `recommended_price` (must be `>1.0`).

## Example configuration snippets

### `EMAG_CHARACTERISTICS_MAP_JSON`

```json
{
  "room-thermostat": {
    "5704": "Термостат",
    "8434": "Вътрешна употреба",
    "7597": "BEOK",
    "9645": {
      "electric": "Електрическо подово отопление",
      "water": "Водно подово отопление",
      "gas-boiler": "Газов котел"
    }
  },
  "gas-boiler-thermostat": {
    "5704": "Термостат",
    "8434": "Вътрешна употреба",
    "7597": "BEOK",
    "9645": {
      "electric": "Електрическо подово отопление",
      "water": "Водно подово отопление",
      "gas-boiler": "Газов котел"
    }
  }
}
```

### `EMAG_FAMILY_MAP_JSON`

```json
{
  "tgm50-wifi-ep": { "name": "TGM50-WIFI", "family_type_id": 1, "color": "Бял" },
  "tgm50-wifi-wp": { "name": "TGM50-WIFI", "family_type_id": 1, "color": "Бял" },
  "tgm50b-wifi-ep": { "name": "TGM50B-WIFI", "family_type_id": 1, "color": "Черен" },
  "tgm50b-wifi-wp": { "name": "TGM50B-WIFI", "family_type_id": 1, "color": "Черен" },
  "tcc31-wifi-ep": { "name": "TCC31-WIFI", "family_type_id": 1, "color": "Бял" },
  "tcc31-wifi-wp": { "name": "TCC31-WIFI", "family_type_id": 1, "color": "Бял" },
  "tcc31-wifi-wpb": { "name": "TCC31-WIFI", "family_type_id": 1, "color": "Бял" },
  "tgr85-wifi-ep": { "name": "TGR85-WIFI", "family_type_id": 1 },
  "tgr85-wifi-wpb": { "name": "TGR85-WIFI", "family_type_id": 1 },
  "bot-r7x-wifi-nr": { "name": "BOT-R7X-WIFI", "family_type_id": 1 }
}
```

## Operational note

If eMAG rejects any characteristic value, the value text must exactly match the allowed dropdown value for that category.  
In that case, update the corresponding JSON mapping value and sync again.
