import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.TWILIO_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("TWILIO_ENCRYPTION_KEY environment variable is required");
  }
  // Key must be 32 bytes (256 bits) — expect hex-encoded
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error("TWILIO_ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  return keyBuffer;
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Format: iv:tag:ciphertext (all base64)
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format");
  }

  const iv = Buffer.from(parts[0], "base64");
  const tag = Buffer.from(parts[1], "base64");
  const encrypted = Buffer.from(parts[2], "base64");

  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error("Invalid IV or auth tag length");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  try {
    const iv = Buffer.from(parts[0], "base64");
    const tag = Buffer.from(parts[1], "base64");
    return iv.length === IV_LENGTH && tag.length === TAG_LENGTH;
  } catch {
    return false;
  }
}
