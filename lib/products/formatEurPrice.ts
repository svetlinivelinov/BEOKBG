export function formatEurPrice(value: number, locale?: string): string {
  const normalizedLocale = locale === 'bg' ? 'bg-BG' : 'en-IE';

  return new Intl.NumberFormat(normalizedLocale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}
