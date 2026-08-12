// Category slugs that are acronyms and should be rendered fully uppercase.
const ACRONYMS = new Set(['trv']);

const CATEGORY_LABELS: Record<string, { en: string; bg: string }> = {
  'gas-boiler-thermostat': {
    en: 'Gas Boiler Thermostat',
    bg: 'Термостат за газов котел'
  },
  'hub-controller': {
    en: 'Hub Controller',
    bg: 'Централен контролер (хъб)'
  },
  'room-thermostat': {
    en: 'Room Thermostat',
    bg: 'Стаен термостат'
  },
  'thermal-actuator': {
    en: 'Thermal Actuator',
    bg: 'Термичен задвижващ механизъм'
  },
  trv: {
    en: 'TRV',
    bg: 'Термостатичен радиаторен вентил'
  }
};

export const formatCategoryLabel = (slug: string, locale: string = 'en') => {
  const normalized = slug.toLowerCase();
  const label = CATEGORY_LABELS[normalized];

  if (label) {
    return label[locale as keyof typeof label] ?? label.en;
  }

  return slug
    .split('-')
    .map((word) => (ACRONYMS.has(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
};
