// IV length in bytes
export const ENCRYPTION_IV_LENGTH = 12 as const;

export type GeneratedEncryptionKey = {
  key: CryptoKey;
  iv: Uint8Array<ArrayBuffer>;
};

/**
 * generates a 256 bit symmetric AES-GCM key and an initialization vector from the
 * provided plaintext
 */
export async function generateKeyFromPlainText(
  plaintext: string,
): Promise<GeneratedEncryptionKey> {
  const enc = new TextEncoder().encode(plaintext);
  const hash = await crypto.subtle.digest("SHA-256", enc);

  // use hash of the plaintext as key material for generating psuedo random key
  const hkdfKey = await crypto.subtle.importKey("raw", hash, "HKDF", false, [
    "deriveKey",
    "deriveBits",
  ]);

  // derive AES-GCM key from the PRK
  const key = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(),
      info: new TextEncoder().encode("zero-sketch-aes-key"),
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

  // derive 12 bytes iv deterministically from the PRK
  const ivBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(),
      info: new TextEncoder().encode("zero-sketch-aes-iv"),
    },
    hkdfKey,
    ENCRYPTION_IV_LENGTH * 8, // 12 bytes
  );
  return { key, iv: new Uint8Array(ivBits) };
}

/** convert `CryptoKey` to base64 string */
export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return new Uint8Array(raw).toBase64({
    alphabet: "base64url",
    omitPadding: true,
  });
}

/** converts key in base64 format to web `CryptoKey`  */
export async function importKey(b64: string): Promise<CryptoKey> {
  const raw = Uint8Array.fromBase64(b64, { alphabet: "base64url" });
  return crypto.subtle.importKey("raw", raw, "AES-GCM", true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encrypt(
  key: CryptoKey,
  iv: Uint8Array<ArrayBuffer>,
  plaintext: string,
): Promise<Uint8Array> {
  const enc = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc,
  );
  return new Uint8Array(ciphertext);
}

export async function decrypt(
  key: CryptoKey,
  iv: BufferSource,
  ciphertext: BufferSource,
): Promise<string> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(plaintext);
}
