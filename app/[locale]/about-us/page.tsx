import { getDictionary } from '@/lib/i18n/getDictionary';
import Footer from '@/components/Footer';

export default async function AboutPage({ params }: { params: { locale: string } }) {
  const dict = await getDictionary(params.locale);
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          {dict['about_heading'] ?? 'За нас'}
        </h1>
        <p className="text-gray-600 leading-7">
          {dict['about_text'] ?? 'BEOKBG е водещ доставчик на термостати и актуатори за радиатори.'}
        </p>
      </main>
      <Footer dict={dict} locale={params.locale} />
    </div>
  );
}
