import { StoredStripeOrder } from './stripeOrders';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeRecipient(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || !isValidEmail(trimmed)) {
    return null;
  }

  return trimmed;
}

function normalizeSender(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes('<') && trimmed.includes('>')) {
    return trimmed;
  }

  const parts = trimmed.split(/\s+/);
  const possibleEmail = parts[parts.length - 1] ?? '';
  if (!isValidEmail(possibleEmail)) {
    return null;
  }

  const name = parts.slice(0, -1).join(' ').trim();
  if (!name) {
    return possibleEmail;
  }

  return `${name} <${possibleEmail}>`;
}

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

function formatOptional(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed || '-';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
  const customerLabel = isBg ? 'Клиент' : 'Customer';
  const nameLabel = isBg ? 'Име' : 'Full name';
  const emailLabel = 'Email';
  const phoneLabel = isBg ? 'Телефон' : 'Phone';
  const deliveryTypeLabel = isBg ? 'Доставка' : 'Delivery type';
  const addressLabel = isBg ? 'Адрес' : 'Address';
  const cityLabel = isBg ? 'Град' : 'City';
  const postalCodeLabel = isBg ? 'Пощенски код' : 'Postal code';
  const lockerLabel = isBg ? 'Easybox' : 'Easybox locker';

  const itemsRows = order.items
    .map((item) => `<li>${escapeHtml(item.model)} x ${item.quantity}</li>`)
    .join('');

  const deliveryTypeValue = order.delivery?.deliveryType === 'easybox'
    ? 'Easybox'
    : order.delivery?.deliveryType === 'address'
      ? (isBg ? 'Адрес' : 'Address')
      : '-';

  const customerRows = [
    `<li><strong>${nameLabel}:</strong> ${escapeHtml(formatOptional(order.delivery?.fullName))}</li>`,
    `<li><strong>${emailLabel}:</strong> ${escapeHtml(formatOptional(order.delivery?.email ?? order.customerEmail))}</li>`,
    `<li><strong>${phoneLabel}:</strong> ${escapeHtml(formatOptional(order.delivery?.phone))}</li>`,
    `<li><strong>${deliveryTypeLabel}:</strong> ${escapeHtml(deliveryTypeValue)}</li>`,
    `<li><strong>${addressLabel}:</strong> ${escapeHtml(formatOptional(order.delivery?.addressLine1))}</li>`,
    `<li><strong>${cityLabel}:</strong> ${escapeHtml(formatOptional(order.delivery?.city))}</li>`,
    `<li><strong>${postalCodeLabel}:</strong> ${escapeHtml(formatOptional(order.delivery?.postalCode))}</li>`,
    `<li><strong>${lockerLabel}:</strong> ${escapeHtml(formatOptional(order.delivery?.lockerId))}</li>`
  ].join('');

  return [
    '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">',
    `<h2>${headline}</h2>`,
    `<p>${intro}</p>`,
    `<p><strong>${amountLabel}:</strong> ${formatAmountCents(order.amountTotal, order.currency)}</p>`,
    `<p><strong>${sessionLabel}:</strong> ${escapeHtml(order.sessionId)}</p>`,
    `<p><strong>${dateLabel}:</strong> ${new Date(order.paidAt).toLocaleString()}</p>`,
    `<p><strong>${itemsLabel}:</strong></p>`,
    `<ul>${itemsRows}</ul>`,
    `<p><strong>${customerLabel}:</strong></p>`,
    `<ul>${customerRows}</ul>`,
    '</div>'
  ].join('');
}

export async function sendOrderConfirmationEmail(order: StoredStripeOrder): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const emailFrom = normalizeSender(process.env.ORDER_EMAIL_FROM?.trim() ?? '');
  const internalNotificationEmail = process.env.ORDER_NOTIFICATION_EMAIL?.trim() || null;

  const recipients = [
    order.customerEmail?.trim() || null,
    internalNotificationEmail
  ]
    .map((value) => (value ? normalizeRecipient(value) : null))
    .filter((value): value is string => Boolean(value));

  const uniqueRecipients = Array.from(new Set(recipients));

  if (!resendApiKey || !emailFrom || uniqueRecipients.length === 0) {
    console.warn('[order_confirmation_email_skipped]', {
      hasResendApiKey: Boolean(resendApiKey),
      hasOrderEmailFrom: Boolean(emailFrom),
      hasCustomerEmail: Boolean(order.customerEmail),
      hasOrderNotificationEmail: Boolean(internalNotificationEmail),
      sessionId: order.sessionId
    });
    return false;
  }

  const payload = {
    from: emailFrom,
    to: uniqueRecipients,
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
    const responseBody = await response.text().catch(() => '');
    throw new Error(`email_send_failed:${response.status}:${responseBody.slice(0, 500)}`);
  }

  return true;
}
