import type { Metadata } from 'next';
import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Container from '../../../../components/Container';
import { getDictionary } from '../../../../lib/i18n/getDictionary';
import { readStripeOrders } from '../../../../lib/payments/stripeOrders';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: locale === 'bg' ? 'Админ поръчки' : 'Admin orders',
    robots: {
      index: false,
      follow: false
    }
  };
}

export default async function AdminOrdersPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  const dict = await getDictionary(locale);
  const isBg = locale === 'bg';

  const expectedToken = process.env.ADMIN_ORDERS_TOKEN?.trim();
  const isAuthorized = !expectedToken || token === expectedToken;

  const orders = isAuthorized ? await readStripeOrders() : [];
  const sorted = orders.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header locale={locale} dict={dict} />
      <Container className="flex-1 py-8">
        <h1 className="text-3xl font-bold mb-4">{isBg ? 'История на платени поръчки' : 'Paid orders history'}</h1>

        {!isAuthorized ? (
          <div className="rounded-lg border border-red-200 bg-white p-4 text-red-700">
            {isBg ? 'Нямате достъп до тази страница.' : 'You are not authorized to view this page.'}
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-gray-600">
            {isBg ? 'Все още няма платени поръчки.' : 'No paid orders yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-left text-gray-700">
                <tr>
                  <th className="px-4 py-3">{isBg ? 'Дата' : 'Date'}</th>
                  <th className="px-4 py-3">{isBg ? 'Имейл' : 'Email'}</th>
                  <th className="px-4 py-3">{isBg ? 'Сума' : 'Amount'}</th>
                  <th className="px-4 py-3">{isBg ? 'Сесия' : 'Session'}</th>
                  <th className="px-4 py-3">{isBg ? 'Артикули' : 'Items'}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((order) => {
                  const amount = order.amountTotal !== null && order.currency
                    ? new Intl.NumberFormat(isBg ? 'bg-BG' : 'en-US', {
                        style: 'currency',
                        currency: order.currency.toUpperCase()
                      }).format(order.amountTotal / 100)
                    : '-';

                  return (
                    <tr key={order.sessionId} className="border-t border-gray-200 align-top">
                      <td className="px-4 py-3 text-gray-700">{new Date(order.paidAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-700">{order.customerEmail ?? '-'}</td>
                      <td className="px-4 py-3 font-semibold text-brand-orange">{amount}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{order.sessionId}</td>
                      <td className="px-4 py-3 text-gray-700">
                        <ul className="list-disc pl-4 space-y-1">
                          {order.items.map((item) => (
                            <li key={`${order.sessionId}-${item.productId}`}>{item.model} x {item.quantity}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Container>
      <Footer locale={locale} dict={dict} />
    </div>
  );
}
