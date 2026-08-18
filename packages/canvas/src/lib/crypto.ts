/** generates a 256 bit symmetric AES-GCM key */
export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
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

type EncryptionResult = {
  iv: Uint8Array;
  ciphertext: Uint8Array;
};

// 96-bit nonce for GCM
export const ENCRYPTION_IV_LENGTH = 12;

export async function encrypt(
  key: CryptoKey,
  plaintext: string,
): Promise<EncryptionResult> {
  const initializationVector = crypto.getRandomValues(
    new Uint8Array(ENCRYPTION_IV_LENGTH),
  );
  const enc = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: initializationVector },
    key,
    enc,
  );
  return { iv: initializationVector, ciphertext: new Uint8Array(ciphertext) };
}

export async function decrypt(
  key: CryptoKey,
  iv: BufferSource | Uint8Array,
  ciphertext: BufferSource | Uint8Array,
): Promise<string> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  );
  return new TextDecoder().decode(plaintext);
}
