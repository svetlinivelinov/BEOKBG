import type { Metadata } from 'next';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import Container from '../../../components/Container';
import CartPageClient from '../../../components/cart/CartPageClient';
import { getDictionary } from '../../../lib/i18n/getDictionary';
import { getProducts } from '../../../lib/products/getProducts';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return {
    title: dict.cart,
    robots: {
      index: false,
      follow: true
    },
    alternates: {
      canonical: `/${locale}/cart`
    }
  };
}

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const products = getProducts(locale);
  const productMetaById = Object.fromEntries(
    products.map((product) => [
      product.id,
      {
        name: product.name,
        model: product.model,
        finalPriceEur: product.finalPriceEur,
        priceQty: product.priceQty
      }
    ])
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header locale={locale} dict={dict} />
      <Container className="flex-1 py-8">
        <CartPageClient
          locale={locale}
          productMetaById={productMetaById}
          labels={{
            cart: dict.cart,
            quantity: dict.quantity,
            unitPrice: dict.unit_price,
            lineTotal: dict.line_total,
            subtotal: dict.subtotal,
            remove: dict.remove,
            clearCart: dict.clear_cart,
            continueShopping: dict.continue_shopping,
            cartEmpty: dict.cart_empty,
            orderRequestTitle: dict.order_request_title,
            customerName: dict.customer_name,
            customerEmail: dict.customer_email,
            customerPhone: dict.customer_phone,
            customerNote: dict.customer_note,
            sendOrderRequest: dict.send_order_request,
            orderRequestIntro: dict.order_request_intro,
            pleaseFillRequired: dict.please_fill_required,
            orderRequestSuccess: dict.order_request_success,
            orderRequestError: dict.order_request_error,
            lowStockAlertTitle: dict.low_stock_alert_title,
            sendFactoryReorderEmail: dict.send_factory_reorder_email,
            proceedToCheckout: dict.proceed_to_checkout,
            checkoutProcessing: dict.checkout_processing,
            checkoutError: dict.checkout_error,
            checkoutUnavailableForLowStock: dict.checkout_unavailable_for_low_stock,
            checkoutNotConfigured: dict.checkout_not_configured,
            checkoutSuccess: dict.checkout_success,
            checkoutCancelled: dict.checkout_cancelled,
            paymentOptionsTitle: dict.payment_options_title
          }}
        />
      </Container>
      <Footer locale={locale} dict={dict} />
    </div>
  );
}
