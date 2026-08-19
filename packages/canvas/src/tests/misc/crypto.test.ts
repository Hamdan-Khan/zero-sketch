import {
  decrypt,
  encrypt,
  ENCRYPTION_IV_LENGTH,
  exportKey,
  generateKeyFromPlainText,
  importKey,
} from "@/lib/crypto";
import { describe, expect, it } from "vitest";

describe("lib/crypto", () => {
  describe("ENCRYPTION_IV_LENGTH", () => {
    it("is 12 bytes (96-bit standard for AES-GCM)", () => {
      expect(ENCRYPTION_IV_LENGTH).toBe(12);
    });
  });

  describe("generateKeyFromPlainText", () => {
    it("generates a 256-bit AES-GCM key and a 12-byte IV", async () => {
      const { key, iv } = await generateKeyFromPlainText("test-diagram");
      expect(key).toBeDefined();
      expect(key.algorithm).toMatchObject({ name: "AES-GCM", length: 256 });
      expect(key.usages).toContain("encrypt");
      expect(key.usages).toContain("decrypt");
      expect(key.extractable).toBe(true);

      expect(iv).toBeInstanceOf(Uint8Array);
      expect(iv.byteLength).toBe(ENCRYPTION_IV_LENGTH);
    });

    it("deterministically derives identical key and IV for identical input", async () => {
      const payload = JSON.stringify({ nodes: [{ id: "1" }], edges: [] });
      const first = await generateKeyFromPlainText(payload);
      const second = await generateKeyFromPlainText(payload);

      const rawKey1 = await crypto.subtle.exportKey("raw", first.key);
      const rawKey2 = await crypto.subtle.exportKey("raw", second.key);

      expect(new Uint8Array(rawKey1)).toEqual(new Uint8Array(rawKey2));
      expect(first.iv).toEqual(second.iv);
    });

    it("derives different keys and IVs for different inputs", async () => {
      const resA = await generateKeyFromPlainText("diagram-A");
      const resB = await generateKeyFromPlainText("diagram-B");

      const rawKeyA = await crypto.subtle.exportKey("raw", resA.key);
      const rawKeyB = await crypto.subtle.exportKey("raw", resB.key);

      expect(new Uint8Array(rawKeyA)).not.toEqual(new Uint8Array(rawKeyB));
      expect(resA.iv).not.toEqual(resB.iv);
    });

    it("handles empty string without failing", async () => {
      const { key, iv } = await generateKeyFromPlainText("");
      expect(key).toBeDefined();
      expect(iv.byteLength).toBe(12);
    });
  });

  describe("exportKey and importKey", () => {
    it("exports key to a URL-safe base64 string without padding", async () => {
      const { key } = await generateKeyFromPlainText("diagram");
      const b64Key = await exportKey(key);

      expect(typeof b64Key).toBe("string");
      expect(b64Key.length).toBeGreaterThan(0);
      expect(b64Key).not.toContain("=");
      expect(b64Key).not.toContain("+");
      expect(b64Key).not.toContain("/");
      expect(b64Key).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("imports exported base64 key back to a valid AES-GCM CryptoKey", async () => {
      const { key: originalKey } = await generateKeyFromPlainText("diagram");
      const b64Key = await exportKey(originalKey);

      const importedKey = await importKey(b64Key);
      expect(importedKey).toBeDefined();
      expect(importedKey.algorithm).toMatchObject({
        name: "AES-GCM",
        length: 256,
      });
      expect(importedKey.usages).toContain("encrypt");
      expect(importedKey.usages).toContain("decrypt");

      const reExported = await exportKey(importedKey);
      expect(reExported).toBe(b64Key);
    });

    it("rejects or throws on malformed key strings", async () => {
      await expect(importKey("invalid!not!base64!key")).rejects.toThrow();
    });
  });

  describe("encrypt and decrypt", () => {
    it("encrypts and decrypts basic plaintext correctly", async () => {
      const plaintext = "Hello Zero Sketch";
      const { key, iv } = await generateKeyFromPlainText(plaintext);

      const ciphertext = await encrypt(key, iv, plaintext);
      expect(ciphertext).toBeInstanceOf(Uint8Array);
      expect(ciphertext.length).toBeGreaterThan(0);

      const decrypted = await decrypt(key, iv, ciphertext);
      expect(decrypted).toBe(plaintext);
    });

    it("encrypts and decrypts complex JSON diagrams with nested structures", async () => {
      const diagram = {
        nodes: [
          {
            id: "1",
            type: "rectangle",
            position: { x: 100, y: 200 },
            data: { label: "Client Gateway", style: { color: "#ff0000" } },
          },
          {
            id: "2",
            type: "database",
            position: { x: 300, y: 400 },
            data: { label: "Primary DB" },
          },
        ],
        edges: [
          {
            id: "e1-2",
            source: "1",
            target: "2",
            animated: true,
            label: "gRPC",
          },
        ],
        grid: true,
      };
      const jsonString = JSON.stringify(diagram);
      const { key, iv } = await generateKeyFromPlainText(jsonString);

      const ciphertext = await encrypt(key, iv, jsonString);
      const decrypted = await decrypt(key, iv, ciphertext);

      expect(decrypted).toBe(jsonString);
      expect(JSON.parse(decrypted)).toEqual(diagram);
    });

    it("decrypts when iv and ciphertext are provided as raw ArrayBuffers", async () => {
      const text = "BufferSource test payload";
      const { key, iv } = await generateKeyFromPlainText(text);

      const ciphertext = await encrypt(key, iv, text);

      const ivBuffer = iv.buffer.slice(
        iv.byteOffset,
        iv.byteOffset + iv.byteLength,
      );
      const cipherBuffer = ciphertext.buffer.slice(
        ciphertext.byteOffset,
        ciphertext.byteOffset + ciphertext.byteLength,
      );

      const decrypted = await decrypt(key, ivBuffer, cipherBuffer);
      expect(decrypted).toBe(text);
    });

    it("fails to decrypt with a different/wrong key (authentication failure)", async () => {
      const text = "Confidential diagram";
      const { key: keyA, iv } = await generateKeyFromPlainText("diagram-A");
      const { key: keyB } = await generateKeyFromPlainText("diagram-B");

      const ciphertext = await encrypt(keyA, iv, text);

      await expect(decrypt(keyB, iv, ciphertext)).rejects.toThrow();
    });

    it("fails to decrypt when ciphertext is tampered or corrupted", async () => {
      const text = "Integrity check diagram";
      const { key, iv } = await generateKeyFromPlainText(text);

      const ciphertext = await encrypt(key, iv, text);
      const tamperedCiphertext = new Uint8Array(ciphertext);
      // Flip a bit in the ciphertext / auth tag
      tamperedCiphertext[tamperedCiphertext.length - 1] ^= 0xff;

      await expect(decrypt(key, iv, tamperedCiphertext)).rejects.toThrow();
    });

    it("fails to decrypt when IV is tampered or incorrect", async () => {
      const text = "IV tamper check";
      const { key, iv } = await generateKeyFromPlainText(text);

      const ciphertext = await encrypt(key, iv, text);
      const tamperedIv = new Uint8Array(iv);
      tamperedIv[0] ^= 0x01;

      await expect(decrypt(key, tamperedIv, ciphertext)).rejects.toThrow();
    });
  });

  describe("End-to-End Share Pipeline Simulation", () => {
    it("completes full export -> combined IV/ciphertext -> slice -> import -> decrypt pipeline", async () => {
      const originalDiagram = JSON.stringify({
        nodes: [{ id: "n1", position: { x: 10, y: 20 }, data: { label: "A" } }],
        edges: [],
        grid: false,
      });

      // 1. Generate key & IV
      const { key, iv } = await generateKeyFromPlainText(originalDiagram);

      // 2. Export key to string (placed in URL hash)
      const shareUrlHash = await exportKey(key);

      // 3. Encrypt payload
      const ciphertext = await encrypt(key, iv, originalDiagram);

      // 4. Combine IV and ciphertext into one Uint8Array payload (as uploaded to storage)
      const combined = new Uint8Array(iv.length + ciphertext.length);
      combined.set(iv, 0);
      combined.set(ciphertext, iv.length);

      // 5. Simulate receiver: slice IV and ciphertext
      const receivedIv = combined.slice(0, ENCRYPTION_IV_LENGTH);
      const receivedCiphertext = combined.slice(ENCRYPTION_IV_LENGTH);

      // 6. Import key from hash
      const receiverKey = await importKey(shareUrlHash);

      // 7. Decrypt
      const decryptedDiagram = await decrypt(
        receiverKey,
        receivedIv,
        receivedCiphertext,
      );

      expect(decryptedDiagram).toBe(originalDiagram);
      expect(JSON.parse(decryptedDiagram)).toEqual(JSON.parse(originalDiagram));
    });
  });
});
