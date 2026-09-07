declare module 'tweetnacl' {
  export interface SignKeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  }

  export interface DetachedSign {
    (message: Uint8Array, secretKey: Uint8Array): Uint8Array;
    verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean;
  }

  export interface Sign {
    (message: Uint8Array, secretKey: Uint8Array): Uint8Array;
    open(signedMessage: Uint8Array, publicKey: Uint8Array): Uint8Array | null;
    detached: DetachedSign;
    keyPair: {
      (): SignKeyPair;
      fromSecretKey(secretKey: Uint8Array): SignKeyPair;
      fromSeed(seed: Uint8Array): SignKeyPair;
    };
  }

  export const sign: Sign;
  export function randomBytes(n: number): Uint8Array;
  
  const nacl: {
    sign: Sign;
    randomBytes(n: number): Uint8Array;
  };

  export default nacl;
}
