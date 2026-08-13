import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Container from '../../../../components/Container';
import { getDictionary } from '../../../../lib/i18n/getDictionary';
import { readStripeOrders } from '../../../../lib/payments/stripeOrders';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: locale === 'bg' ? 'Успешно плащане' : 'Payment successful',
    robots: {
      index: false,
      follow: true
    }
  };
}

export default async function CheckoutSuccessPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { locale } = await params;
  const { session_id: sessionId } = await searchParams;
  const dict = await getDictionary(locale);

  const orders = await readStripeOrders();
  const order = sessionId ? orders.find((entry) => entry.sessionId === sessionId) : undefined;

  const isBg = locale === 'bg';
  const title = isBg ? 'Плащането е успешно' : 'Payment successful';
  const fallbackText = isBg
    ? 'Поръчката е записана. Ако не виждате детайли, те ще се появят скоро след webhook обработката.'
    : 'Your order was received. If details are missing, they will appear shortly after webhook processing.';

  const totalText = order?.amountTotal !== null && order?.amountTotal !== undefined && order.currency
    ? new Intl.NumberFormat(isBg ? 'bg-BG' : 'en-US', {
        style: 'currency',
        currency: order.currency.toUpperCase()
      }).format(order.amountTotal / 100)
    : '-';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header locale={locale} dict={dict} />
      <Container className="flex-1 py-8">
        <div className="rounded-lg border border-green-200 bg-white p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{title}</h1>
          <p className="text-gray-700 mb-6">{fallbackText}</p>

          {order && (
            <div className="rounded border border-gray-200 p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">{isBg ? 'Сесия' : 'Session'}: <span className="font-medium text-gray-900">{order.sessionId}</span></p>
              <p className="text-sm text-gray-600 mb-1">{isBg ? 'Платено на' : 'Paid at'}: <span className="font-medium text-gray-900">{new Date(order.paidAt).toLocaleString()}</span></p>
              <p className="text-sm text-gray-600 mb-3">{isBg ? 'Обща сума' : 'Total'}: <span className="font-semibold text-brand-orange">{totalText}</span></p>

              <p className="text-sm font-semibold text-gray-800 mb-2">{isBg ? 'Артикули' : 'Items'}:</p>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                {order.items.map((item) => (
                  <li key={`${item.productId}-${item.model}`}>{item.model} x {item.quantity}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <Link
              href={`/${locale}/products`}
              className="inline-flex items-center rounded bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange/90"
            >
              {dict.continue_shopping}
            </Link>
            <Link
              href={`/${locale}/cart`}
              className="inline-flex items-center rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-brand-orange hover:text-brand-orange"
            >
              {dict.cart}
            </Link>
          </div>
        </div>
      </Container>
      <Footer locale={locale} dict={dict} />
    </div>
  );
}
