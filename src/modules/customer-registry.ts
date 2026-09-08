import { AlcoCustomerRecord, AlcoLicenseRecord } from './types';
import { getLicenseHistory, STORAGE_KEYS } from './storage';

export function normalizeCustomerEmail(email: string): string {
  return email.trim().toLowerCase();
}

function shortName(name: string): string {
  const clean = name.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '')
    .toUpperCase();
  return (clean || 'CUSTOMER').slice(0, 10);
}

function randomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}

export function generateCustomerId(name: string, existing: AlcoCustomerRecord[] = getCustomerRegistry()): string {
  let id = '';
  do {
    id = `CUS-${shortName(name)}-${randomCode()}`;
  } while (existing.some(c => c.customerId === id));
  return id;
}

export function getCustomerRegistry(): AlcoCustomerRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomerRegistry(customers: AlcoCustomerRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
}

export function findCustomerByEmail(email: string): AlcoCustomerRecord | null {
  const normalized = normalizeCustomerEmail(email);
  if (!normalized) return null;
  return getCustomerRegistry().find(c => c.emailNormalized === normalized) || null;
}

export function upsertCustomerFromRequest(input: {
  name: string;
  email: string;
  whatsapp?: string;
  segment?: string;
  acquisitionSource?: string;
  marketingConsent?: boolean;
}): { customer: AlcoCustomerRecord; created: boolean } {
  const emailNormalized = normalizeCustomerEmail(input.email);
  if (!input.name.trim()) throw new Error('Customer name is required');
  if (!emailNormalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) {
    throw new Error('Valid customer email is required');
  }

  const customers = getCustomerRegistry();
  const existing = customers.find(c => c.emailNormalized === emailNormalized);
  if (existing) {
    return { customer: existing, created: false };
  }

  const now = new Date().toISOString();
  const customer: AlcoCustomerRecord = {
    customerId: generateCustomerId(input.name, customers),
    name: input.name.trim(),
    email: input.email.trim(),
    emailNormalized,
    whatsapp: input.whatsapp?.trim() || undefined,
    segment: input.segment?.trim() || undefined,
    acquisitionSource: input.acquisitionSource?.trim() || undefined,
    marketingConsent: input.marketingConsent,
    createdAt: now,
    updatedAt: now,
  };
  saveCustomerRegistry([customer, ...customers]);
  return { customer, created: true };
}

export function getLicensesForCustomer(customerId: string): AlcoLicenseRecord[] {
  return getLicenseHistory().filter(record => record.payload.customerId === customerId);
}
