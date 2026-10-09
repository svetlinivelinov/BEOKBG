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

function asPositiveNumber(value: unknown, fallback: number): number {
  const normalized = typeof value === 'number' ? value : Number.parseFloat(asSafeString(value));
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return fallback;
  }

  return normalized;
}

function asServiceIdFromEnv(name: string, fallback: string): string {
  const candidate = process.env[name]?.trim();
  return candidate || fallback;
}

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function resolveServiceId(deliveryType: DeliveryType, fallbackServiceId: string): string {
  if (deliveryType === 'easybox') {
    return asServiceIdFromEnv('SAMEDAY_SERVICE_ID_EASYBOX', asServiceIdFromEnv('SAMEDAY_SERVICE_ID', fallbackServiceId));
  }

  return asServiceIdFromEnv('SAMEDAY_SERVICE_ID_ADDRESS', asServiceIdFromEnv('SAMEDAY_SERVICE_ID', fallbackServiceId));
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
  const defaultServiceId = resolveEnv('SAMEDAY_SERVICE_ID');
  const pickupId = resolveEnv('SAMEDAY_PICKUP_POINT_ID');

  const includeCod = Boolean(process.env.SAMEDAY_ENABLE_COD?.trim()?.toLowerCase() === 'true');
  const packageWeight = asPositiveNumber(process.env.SAMEDAY_PARCEL_WEIGHT_KG, 1);
  const parcelLength = asPositiveNumber(process.env.SAMEDAY_PARCEL_LENGTH_CM, 20);
  const parcelWidth = asPositiveNumber(process.env.SAMEDAY_PARCEL_WIDTH_CM, 15);
  const parcelHeight = asPositiveNumber(process.env.SAMEDAY_PARCEL_HEIGHT_CM, 10);
  const packageType = Math.max(0, Math.min(2, Math.floor(asPositiveNumber(process.env.SAMEDAY_PACKAGE_TYPE, 0))));
  const countyFallback = asSafeString(process.env.SAMEDAY_RECIPIENT_COUNTY_DEFAULT);
  const cityFallback = asSafeString(process.env.SAMEDAY_RECIPIENT_CITY_DEFAULT);

  const recipientCounty = countyFallback || cityFallback || asSafeString(input.recipient.city) || 'Unknown';
  const recipientCity = asSafeString(input.recipient.city) || cityFallback || countyFallback || 'Unknown';
  const resolvedServiceId = input.serviceId || resolveServiceId(input.deliveryType, defaultServiceId);
  const numericServiceId = parsePositiveInteger(resolvedServiceId);
  if (!numericServiceId) {
    throw new Error('sameday_awb_failed:invalid_service_id');
  }

  const payload: Record<string, unknown> = {
    clientId: input.clientId || clientId,
    pickupPoint: input.pickupId || pickupId,
    packageType,
    packageNumber: 1,
    packageWeight,
    service: numericServiceId,
    awbPayment: 1,
    cashOnDelivery: includeCod && typeof input.codAmountEur === 'number' && Number.isFinite(input.codAmountEur) && input.codAmountEur > 0
      ? Number(input.codAmountEur.toFixed(2))
      : 0,
    cashOnDeliveryReturns: 1,
    insuredValue: 0,
    thirdPartyPickup: 0,
    awbRecipient: {
      name: input.recipient.fullName,
      phoneNumber: input.recipient.phone,
      email: input.recipient.email,
      personType: 0,
      address: input.deliveryType === 'address' ? input.recipient.addressLine1 : 'easybox delivery',
      city: recipientCity,
      county: recipientCounty,
      cityString: recipientCity,
      countyString: recipientCounty,
      postalCode: input.deliveryType === 'address' ? input.recipient.postalCode : null
    },
    parcels: [
      {
        weight: packageWeight,
        length: parcelLength,
        width: parcelWidth,
        height: parcelHeight
      }
    ]
  };

  if (input.deliveryType === 'easybox') {
    const easyboxId = asSafeString(input.recipient.lockerId);
    const numericEasyboxId = parsePositiveInteger(easyboxId);
    if (!numericEasyboxId) {
      throw new Error('sameday_awb_failed:missing_locker_id');
    }

    payload.oohLastMile = numericEasyboxId;
    payload.oohType = 0;
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
