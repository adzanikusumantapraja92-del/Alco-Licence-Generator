const APPROVED_DEV_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function isAllowedAppNavigation(rawUrl: string, isDev: boolean): boolean {
  try {
    const parsed = new URL(rawUrl);

    if (parsed.protocol === 'file:') {
      return true;
    }

    if (!isDev) {
      return false;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    return APPROVED_DEV_HOSTNAMES.has(parsed.hostname);
  } catch {
    return false;
  }
}
