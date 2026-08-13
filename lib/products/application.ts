export const APPLICATIONS = ['electric', 'water', 'gas-boiler'] as const;

export type ProductApplication = (typeof APPLICATIONS)[number];

export function isProductApplication(value: string | undefined): value is ProductApplication {
  return !!value && APPLICATIONS.includes(value as ProductApplication);
}

export function getApplicationLabels(locale: string): Record<ProductApplication, string> {
  if (locale === 'bg') {
    return {
      electric: 'Електрическо',
      water: 'Водно',
      'gas-boiler': 'Газов котел'
    };
  }

  return {
    electric: 'Electric',
    water: 'Water',
    'gas-boiler': 'Gas Boiler'
  };
}
