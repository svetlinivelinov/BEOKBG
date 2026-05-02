import { getDictionary } from '@/lib/i18n/getDictionary';
import Footer from '@/components/Footer';

export default async function ContactPage({ params }: { params: { locale: string } }) {
  const dict = await getDictionary(params.locale);
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          {dict['contact_heading'] ?? 'Контакти'}
        </h1>
        <p className="text-gray-600">
          {dict['contact_text'] ?? 'Свържете се с нас на:'}{' '}
          <a href="mailto:info@beokbg.com" className="text-blue-600 underline">
            info@beokbg.com
          </a>
        </p>
      </main>
      <Footer dict={dict} locale={params.locale} />
    </div>
  );
}
