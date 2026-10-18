export interface EmagApiResponse<T = unknown> {
  isError: boolean;
  messages?: string[];
  results?: T;
}

export interface EmagStockValue {
  warehouse_id: number;
  value: number;
}

export interface EmagHandlingTimeValue {
  warehouse_id: number;
  value: number;
}

export interface EmagProduct {
  id: number;
  name: string;
  category_id: number;
  part_number: string;
  source_language: string;
  description: string;
  brand: string;
  ean: string;
  images: string[];
  status: number;
  sale_price: number;
  currency_type?: string;
  stock: EmagStockValue[];
  handling_time: EmagHandlingTimeValue[];
  vat_id: number;
  weight: number;
  width: number;
  height: number;
  length: number;
}

export interface EmagProductOfferPayload {
  id: number;
  name: string;
  category_id: number;
  part_number: string;
  source_language: string;
  description: string;
  brand: string;
  ean: string;
  images: string[];
  status: number;
  sale_price: number;
  currency_type?: string;
  stock: EmagStockValue[];
  handling_time: EmagHandlingTimeValue[];
  vat_id: number;
}

export interface EmagProductMeasurementPayload {
  id: number;
  weight: number;
  width: number;
  height: number;
  length: number;
}

export interface EmagOffer {
  id: number;
  status?: number;
  sale_price?: number;
  currency_type?: string;
  stock?: EmagStockValue[];
  handling_time?: EmagHandlingTimeValue[];
  vat_id?: number;
}

export interface EmagStockUpdate {
  id: number;
  value: number;
}

export interface EmagPriceUpdate {
  id: number;
  sale_price: number;
  currency_type?: string;
}

export interface EmagOrderProduct {
  id?: number;
  product_id?: string;
  name?: string;
  quantity?: number;
  sale_price?: number;
  currency?: string;
  status?: number;
  campaign?: {
    id: number;
    name: string;
  };
  [key: string]: unknown;
}

export interface EmagOrder {
  id: number;
  status: number;
  type?: number;
  payment_mode_id?: number;
  date?: string;
  modified?: string;
  customer?: {
    id?: number;
    name?: string;
    email?: string;
    phone_1?: string;
    [key: string]: unknown;
  };
  products?: EmagOrderProduct[];
  [key: string]: unknown;
}

export interface EmagWebhookEvent {
  id: string;
  receivedAt: string;
  sourceIp: string;
  eventType: string;
  payload: unknown;
}
