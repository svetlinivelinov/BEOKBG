import { DeliveryType } from './checkoutDelivery';
import { getCreateAwbPath, samedayRequest } from './samedayClient';

export type CreateAwbInput = {
  clientId: string;
  serviceId: string;
  pickupId: string;
  recipient: {
    fullName: string;
    phone: string;
    email: string;
    addressLine1: string | null;
    city: string | null;
    postalCode: string | null;
    lockerId: string | null;
  };
  deliveryType: DeliveryType;
  codAmountEur: number | null;
};

export type CreateAwbResult = {
  awbNumber: string;
  status: string;
  rawResponse: unknown;
};

type JsonRecord = Record<string, unknown>;

function resolveEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`sameday_not_configured:missing_${name.toLowerCase()}`);
  }

  return value;
}

function asSafeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function extractAwbNumber(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    throw new Error('sameday_awb_failed:invalid_response');
  }

  const data = payload as JsonRecord;
  const direct = asSafeString(data.awbNumber ?? data.awb ?? data.parcelNumber ?? data.number);
  if (direct) {
    return direct;
  }

  if (data.data && typeof data.data === 'object') {
    const nested = data.data as JsonRecord;
    const nestedValue = asSafeString(nested.awbNumber ?? nested.awb ?? nested.parcelNumber ?? nested.number);
    if (nestedValue) {
      return nestedValue;
    }
  }

  throw new Error('sameday_awb_failed:missing_awb_number');
}

export async function createSamedayAwb(input: CreateAwbInput): Promise<CreateAwbResult> {
  const clientId = resolveEnv('SAMEDAY_CLIENT_ID');
  const serviceId = resolveEnv('SAMEDAY_SERVICE_ID');
  const pickupId = resolveEnv('SAMEDAY_PICKUP_POINT_ID');

  const includeCod = Boolean(process.env.SAMEDAY_ENABLE_COD?.trim()?.toLowerCase() === 'true');
  const dimensions = {
    weight: Number.parseFloat(process.env.SAMEDAY_PARCEL_WEIGHT_KG?.trim() || '1') || 1,
    length: Number.parseFloat(process.env.SAMEDAY_PARCEL_LENGTH_CM?.trim() || '20') || 20,
    width: Number.parseFloat(process.env.SAMEDAY_PARCEL_WIDTH_CM?.trim() || '15') || 15,
    height: Number.parseFloat(process.env.SAMEDAY_PARCEL_HEIGHT_CM?.trim() || '10') || 10
  };

  const payload: Record<string, unknown> = {
    clientId: input.clientId || clientId,
    serviceId: input.serviceId || serviceId,
    pickupId: input.pickupId || pickupId,
    parcel: dimensions,
    recipient: {
      name: input.recipient.fullName,
      phone: input.recipient.phone,
      email: input.recipient.email,
      address: input.deliveryType === 'address' ? input.recipient.addressLine1 : undefined,
      city: input.deliveryType === 'address' ? input.recipient.city : undefined,
      postalCode: input.deliveryType === 'address' ? input.recipient.postalCode : undefined
    }
  };

  if (input.deliveryType === 'easybox') {
    payload.lockerId = input.recipient.lockerId;
  }

  if (includeCod && typeof input.codAmountEur === 'number' && Number.isFinite(input.codAmountEur) && input.codAmountEur > 0) {
    payload.cod = {
      amount: Number(input.codAmountEur.toFixed(2)),
      currency: 'EUR'
    };
  }

  const rawResponse = await samedayRequest<unknown>(getCreateAwbPath(), {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  const awbNumber = extractAwbNumber(rawResponse);

  return {
    awbNumber,
    status: 'created',
    rawResponse
  };
}
