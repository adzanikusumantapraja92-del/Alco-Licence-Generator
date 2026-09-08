/**
 * ALCO Canonical JSON Serializer
 * 
 * Reusable core module for deterministic, byte-identical JSON representation.
 * Guarantees that canonicalize(payload) is 100% identical between:
 * 1. ALCO License Generator (Ed25519 signing)
 * 2. ALCO Internal Verifier (in-app validation)
 * 3. ALCO Client Verifier (Electron / customer app verification)
 * 
 * Rules:
 * - Deterministic, recursive object key sorting (UTF-16 code-unit order)
 * - Strict recursion for nested objects and arrays
 * - Preserves null, boolean, number, and Unicode strings
 * - Strictly standard JSON escaping without extra spaces outside strings
 * - Undefined object values are omitted (matching standard JSON.stringify)
 * - Throws on circular references or invalid numbers (NaN, Infinity)
 */

/**
 * Deterministically serializes any JavaScript value to canonical JSON string
 */
export function canonicalJsonStringify(val: unknown): string {
  if (val === null) {
    return 'null';
  }

  const t = typeof val;

  if (t === 'boolean') {
    return val ? 'true' : 'false';
  }

  if (t === 'number') {
    if (!Number.isFinite(val as number)) {
      throw new TypeError('Canonical JSON: Cannot serialize non-finite numbers (NaN or Infinity)');
    }
    return JSON.stringify(val);
  }

  if (t === 'string') {
    return JSON.stringify(val);
  }

  if (Array.isArray(val)) {
    const items = val.map(item => {
      // JSON spec: undefined in array serializes as null
      if (item === undefined || typeof item === 'symbol' || typeof item === 'function') {
        return 'null';
      }
      return canonicalJsonStringify(item);
    });
    return '[' + items.join(',') + ']';
  }

  if (t === 'object') {
    // If object defines custom toJSON, resolve it first
    const target = typeof (val as any).toJSON === 'function' 
      ? (val as any).toJSON() 
      : val;

    if (target === null) {
      return 'null';
    }

    if (typeof target !== 'object' || Array.isArray(target)) {
      return canonicalJsonStringify(target);
    }

    const keys = Object.keys(target).sort();
    const pairs: string[] = [];

    for (const key of keys) {
      const v = (target as Record<string, unknown>)[key];
      // JSON spec: omit undefined, functions, and symbols in objects
      if (v === undefined || typeof v === 'function' || typeof v === 'symbol') {
        continue;
      }
      pairs.push(JSON.stringify(key) + ':' + canonicalJsonStringify(v));
    }

    return '{' + pairs.join(',') + '}';
  }

  // Unsupported types (functions, symbols, undefined at root)
  throw new TypeError(`Canonical JSON: Unsupported type ${t}`);
}

/**
 * Test vectors to guarantee canonical JSON compliance across environments
 */
export interface CanonicalTestVector {
  name: string;
  input: unknown;
  expected: string;
}

export const CANONICAL_TEST_VECTORS: CanonicalTestVector[] = [
  {
    name: 'Unordered Object Keys',
    input: { z: 1, a: 2, m: 3 },
    expected: '{"a":2,"m":3,"z":1}'
  },
  {
    name: 'Deeply Nested Objects',
    input: {
      profile: { name: 'Alco User', age: 30, address: { city: 'Bandung', zip: '40115' } },
      active: true
    },
    expected: '{"active":true,"profile":{"address":{"city":"Bandung","zip":"40115"},"age":30,"name":"Alco User"}}'
  },
  {
    name: 'Arrays with Nested Objects and Nulls',
    input: [
      { b: 'two', a: 'one' },
      null,
      true,
      42,
      ['nested', { y: 2, x: 1 }]
    ],
    expected: '[{"a":"one","b":"two"},null,true,42,["nested",{"x":1,"y":2}]]'
  },
  {
    name: 'Unicode and Escaped Characters',
    input: {
      quote: 'Hello "World"',
      slash: 'C:\\Users\\ALCO',
      newline: 'Line 1\nLine 2\tTabbed',
      unicode: 'Jalan Merdeka № 10 — Café ☕',
      emoji: '🚀 ALCO Ecosystem 🛡️'
    },
    expected: '{"emoji":"🚀 ALCO Ecosystem 🛡️","newline":"Line 1\\nLine 2\\tTabbed","quote":"Hello \\"World\\"","slash":"C:\\\\Users\\\\ALCO","unicode":"Jalan Merdeka № 10 — Café ☕"}'
  },
  {
    name: 'Primitives and Boundaries',
    input: {
      nullVal: null,
      boolTrue: true,
      boolFalse: false,
      zero: 0,
      negative: -99.5,
      decimal: 3.14159,
      emptyStr: '',
      emptyArr: [],
      emptyObj: {}
    },
    expected: '{"boolFalse":false,"boolTrue":true,"decimal":3.14159,"emptyArr":[],"emptyObj":{},"emptyStr":"","negative":-99.5,"nullVal":null,"zero":0}'
  },
  {
    name: 'Custom toJSON and Undefined Handling',
    input: {
      customDateObj: {
        toJSON: () => '2026-09-07T12:00:00.000Z'
      },
      ignoredUndefined: undefined,
      arrayWithUndefined: [1, undefined, 'test', null],
      metadata: {
        appName: 'ALCO Suite',
        notes: undefined,
        issuedBy: 'Authority-1'
      }
    },
    expected: '{"arrayWithUndefined":[1,null,"test",null],"customDateObj":"2026-09-07T12:00:00.000Z","metadata":{"appName":"ALCO Suite","issuedBy":"Authority-1"}}'
  },
  {
    name: 'License Payload Ordering and Canonical Shape',
    input: {
      plan: 'pro',
      licenseVersion: '1.0',
      expiresAt: null,
      deviceId: 'ALCO-DEV-9B4A-71E2-5D88',
      features: ['gpu_accel', 'cloud_sync', 'batch_export'],
      customerId: 'CUST-4029',
      licenseId: 'LIC-ALCO-2026-9B4A',
      issuedAt: '2026-09-07T10:00:00.000Z',
      appId: 'alco-content-engine',
      licenseType: 'lifetime',
      metadata: { notes: 'VIP Customer', appName: 'ALCO Content Engine' }
    },
    expected: '{"appId":"alco-content-engine","customerId":"CUST-4029","deviceId":"ALCO-DEV-9B4A-71E2-5D88","expiresAt":null,"features":["gpu_accel","cloud_sync","batch_export"],"issuedAt":"2026-09-07T10:00:00.000Z","licenseId":"LIC-ALCO-2026-9B4A","licenseType":"lifetime","licenseVersion":"1.0","metadata":{"appName":"ALCO Content Engine","notes":"VIP Customer"},"plan":"pro"}'
  }
];

/**
 * Executes built-in test vectors and asserts 100% byte-identity
 */
export function runCanonicalTestVectors(): { passed: boolean; failures: string[] } {
  const failures: string[] = [];

  for (const vec of CANONICAL_TEST_VECTORS) {
    try {
      const output = canonicalJsonStringify(vec.input);
      if (output !== vec.expected) {
        failures.push(`[${vec.name}] Mismatch:\nExpected: ${vec.expected}\nReceived: ${output}`);
      }
    } catch (err: any) {
      failures.push(`[${vec.name}] Threw error: ${err.message}`);
    }
  }

  return {
    passed: failures.length === 0,
    failures
  };
}
