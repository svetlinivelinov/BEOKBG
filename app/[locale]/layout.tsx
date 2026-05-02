import { getDictionary } from '@/lib/i18n/getDictionary';
import Header from '@/components/Header';

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
      <Header dict={dict} />
      {children}
    </>
  );
}
