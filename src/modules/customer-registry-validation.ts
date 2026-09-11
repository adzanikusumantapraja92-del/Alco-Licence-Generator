const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CustomerRegistryValidationResult {
  valid: boolean;
  error?: string;
}

function isValidDateString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

export function validateCustomerRegistryPayload(customers: unknown): CustomerRegistryValidationResult {
  if (customers === undefined) return { valid: true };
  if (!Array.isArray(customers)) {
    return { valid: false, error: 'Customer registry must be an array.' };
  }
  if (customers.length > 10000) {
    return { valid: false, error: 'Customer registry exceeds maximum allowed records.' };
  }

  const seenCustomerIds = new Set<string>();
  const seenEmails = new Set<string>();

  for (let i = 0; i < customers.length; i += 1) {
    const customer = customers[i];
    if (!customer || typeof customer !== 'object') {
      return { valid: false, error: `Invalid customer registry item at index ${i}.` };
    }

    const c = customer as Record<string, unknown>;
    const customerId = typeof c.customerId === 'string' ? c.customerId.trim() : '';
    const name = typeof c.name === 'string' ? c.name.trim() : '';
    const email = typeof c.email === 'string' ? c.email : '';
    const emailNormalized = typeof c.emailNormalized === 'string' ? c.emailNormalized : '';
    const expectedNormalized = email.trim().toLowerCase();

    if (!customerId || customerId.length > 100) {
      return { valid: false, error: `Invalid customer registry item at index ${i}: customerId must be non-empty and <= 100 characters.` };
    }
    if (seenCustomerIds.has(customerId)) {
      return { valid: false, error: `Duplicate customerId in customer registry: ${customerId}.` };
    }
    seenCustomerIds.add(customerId);

    if (!name || name.length > 200) {
      return { valid: false, error: `Invalid customer registry item at index ${i}: name must be non-empty and <= 200 characters.` };
    }

    if (email.length > 254 || !EMAIL_PATTERN.test(email.trim())) {
      return { valid: false, error: `Invalid customer registry item at index ${i}: email must be valid and <= 254 characters.` };
    }
    if (emailNormalized !== expectedNormalized) {
      return { valid: false, error: `Invalid customer registry item at index ${i}: emailNormalized must equal email.trim().toLowerCase().` };
    }
    if (seenEmails.has(emailNormalized)) {
      return { valid: false, error: `Duplicate emailNormalized in customer registry: ${emailNormalized}.` };
    }
    seenEmails.add(emailNormalized);

    if (!isValidDateString(c.createdAt) || !isValidDateString(c.updatedAt)) {
      return { valid: false, error: `Invalid customer registry item at index ${i}: createdAt and updatedAt must be valid date strings.` };
    }

    if (c.whatsapp !== undefined && typeof c.whatsapp !== 'string') {
      return { valid: false, error: `Invalid customer registry item at index ${i}: whatsapp must be a string.` };
    }
    if (c.segment !== undefined && typeof c.segment !== 'string') {
      return { valid: false, error: `Invalid customer registry item at index ${i}: segment must be a string.` };
    }
    if (c.acquisitionSource !== undefined && typeof c.acquisitionSource !== 'string') {
      return { valid: false, error: `Invalid customer registry item at index ${i}: acquisitionSource must be a string.` };
    }
    if (c.marketingConsent !== undefined && typeof c.marketingConsent !== 'boolean') {
      return { valid: false, error: `Invalid customer registry item at index ${i}: marketingConsent must be a boolean.` };
    }
  }

  return { valid: true };
}
