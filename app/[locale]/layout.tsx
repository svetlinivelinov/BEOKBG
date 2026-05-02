import { getDictionary } from '@/lib/i18n/getDictionary';
import { locales } from '@/lib/i18n/config';
import Header from '@/components/Header';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const dict = await getDictionary(params.locale);
  return (
    <>
      <Header dict={dict} locale={params.locale} />
      {children}
    </>
  );
}
