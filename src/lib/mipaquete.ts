import { randomUUID } from 'crypto';

const BASE_URL = process.env.MIPAQUETE_SANDBOX === 'true'
  ? 'https://api-v2.dev.mpr.mipaquete.com'
  : 'https://api-v2.mpr.mipaquete.com';

function getApiKey(): string {
  const key = process.env.MIPAQUETE_API_KEY;
  if (!key) {
    throw new Error('Missing MIPAQUETE_API_KEY environment variable');
  }
  return key;
}

async function mipaqueteFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': getApiKey(),
      'session-tracker': randomUUID(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MiPaquete API error ${res.status}: ${text}`);
  }

  return res.json();
}

export interface MipaqueteQuoteParams {
  originCity: string;      // DANE code + 000 (e.g., "05001000" for Medellín)
  destinationCity: string; // DANE code + 000
  weight: number;          // kg
  width: number;           // cm
  height: number;          // cm
  length: number;          // cm
  declaredValue: number;   // COP
}

export interface ShippingOption {
  carrier: string;
  carrierImg: string;
  price: number;
  deliveryDays: number;
  serviceType: string;
  score: number;
}

// Get shipping quotes from MiPaquete
export async function getShippingQuotes(params: MipaqueteQuoteParams): Promise<ShippingOption[]> {
  const data = await mipaqueteFetch('/quoteShipping', {
    method: 'POST',
    body: JSON.stringify({
      originLocationCode: params.originCity,
      destinyLocationCode: params.destinationCity,
      weight: params.weight,
      width: params.width,
      height: params.height,
      length: params.length,
      declaredValue: params.declaredValue,
      quantity: 1,
    }),
  });

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((opt: any) => ({
    carrier: opt.deliveryCompanyName || 'Transportadora',
    carrierImg: opt.deliveryCompanyImgUrl || '',
    price: Math.round(opt.shippingCost || 0),
    // shippingTime is in minutes, convert to days
    deliveryDays: opt.shippingTime ? Math.ceil(opt.shippingTime / 1440) : 0,
    serviceType: opt.type === 'messaging' ? 'Mensajería' : 'Paquetería',
    score: opt.score || 0,
  }));
}

export interface MipaqueteShipmentParams {
  originCity: string;
  destinationCity: string;
  weight: number;
  width: number;
  height: number;
  length: number;
  declaredValue: number;
  sender: {
    name: string;
    surname: string;
    phone: string;
    email: string;
    address: string;
    nit?: string;
  };
  receiver: {
    name: string;
    surname: string;
    phone: string;
    email: string;
    address: string;
  };
  comments?: string;
}

export interface ShipmentResult {
  id: string;
  trackingNumber: string;
  carrier: string;
  status: string;
}

// Create a shipping order (guía) in MiPaquete
export async function createShipment(params: MipaqueteShipmentParams): Promise<ShipmentResult> {
  const data = await mipaqueteFetch('/createSending', {
    method: 'POST',
    body: JSON.stringify({
      sender: {
        name: params.sender.name,
        surname: params.sender.surname,
        cellPhone: params.sender.phone,
        email: params.sender.email,
        pickUpAddress: params.sender.address,
        nit: params.sender.nit || '',
      },
      receiver: {
        name: params.receiver.name,
        surname: params.receiver.surname,
        cellPhone: params.receiver.phone,
        email: params.receiver.email,
        destinationAddress: params.receiver.address,
      },
      originLocationCode: params.originCity,
      destinyLocationCode: params.destinationCity,
      weight: params.weight,
      width: params.width,
      height: params.height,
      length: params.length,
      declaredValue: params.declaredValue,
      quantity: 1,
      comments: params.comments || '',
    }),
  });

  return {
    id: data._id || data.id || '',
    trackingNumber: data.guideNumber || data.guide_number || data._id || '',
    carrier: data.deliveryCompanyName || data.carrier || '',
    status: data.status || 'created',
  };
}
