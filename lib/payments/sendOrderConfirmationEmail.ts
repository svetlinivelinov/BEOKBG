import { StoredStripeOrder } from './stripeOrders';

function formatAmountCents(amountTotal: number | null, currency: string | null): string {
  if (amountTotal === null || !currency) {
    return '-';
  }

  const value = amountTotal / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(value);
}

function buildSubject(locale: string): string {
  return locale === 'bg'
    ? 'BEOKBG: Потвърждение за поръчка'
    : 'BEOKBG: Order confirmation';
}

function buildHtml(order: StoredStripeOrder): string {
  const isBg = order.locale === 'bg';
  const headline = isBg ? 'Благодарим за поръчката.' : 'Thank you for your order.';
  const intro = isBg
    ? 'Плащането е прието успешно. По-долу е резюме на поръчката.'
    : 'Your payment was received successfully. Here is your order summary.';
  const amountLabel = isBg ? 'Обща сума' : 'Total amount';
  const sessionLabel = isBg ? 'Номер на сесия' : 'Session ID';
  const dateLabel = isBg ? 'Дата на плащане' : 'Paid at';
  const itemsLabel = isBg ? 'Артикули' : 'Items';

  const itemsRows = order.items
    .map((item) => `<li>${item.model} x ${item.quantity}</li>`)
    .join('');

  return [
    '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">',
    `<h2>${headline}</h2>`,
    `<p>${intro}</p>`,
    `<p><strong>${amountLabel}:</strong> ${formatAmountCents(order.amountTotal, order.currency)}</p>`,
    `<p><strong>${sessionLabel}:</strong> ${order.sessionId}</p>`,
    `<p><strong>${dateLabel}:</strong> ${new Date(order.paidAt).toLocaleString()}</p>`,
    `<p><strong>${itemsLabel}:</strong></p>`,
    `<ul>${itemsRows}</ul>`,
    '</div>'
  ].join('');
}

export async function sendOrderConfirmationEmail(order: StoredStripeOrder): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const emailFrom = process.env.ORDER_EMAIL_FROM?.trim();
  if (!resendApiKey || !emailFrom || !order.customerEmail) {
    return;
  }

  const payload = {
    from: emailFrom,
    to: [order.customerEmail],
    subject: buildSubject(order.locale),
    html: buildHtml(order)
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('email_send_failed');
  }
}
