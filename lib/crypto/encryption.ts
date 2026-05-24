import crypto from "crypto";

/**
 * Chiffrement symetrique AES-256-GCM pour stocker les secrets (mots de passe IMAP)
 * en base de donnees sans qu'ils soient lisibles a quiconque sans la cle.
 *
 * Format en BDD : "iv:authTag:ciphertext" (chaque partie en hex).
 *
 * La cle vient de l'env var EMAIL_CREDS_ENCRYPTION_KEY (32 bytes en hex = 64 chars).
 * Genere une avec : openssl rand -hex 32
 */

const ALGO = "aes-256-gcm";
const KEY_LENGTH = 32; // bytes
const IV_LENGTH = 12; // GCM standard

function getKey(): Buffer {
  const raw = process.env.EMAIL_CREDS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("EMAIL_CREDS_ENCRYPTION_KEY non configuree. Genere-en une avec : openssl rand -hex 32");
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== KEY_LENGTH) {
    throw new Error(`EMAIL_CREDS_ENCRYPTION_KEY doit faire ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex chars). Genere une nouvelle cle.`);
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decrypt(payload: string): string {
  const key = getKey();
  const parts = payload.split(":");
  if (parts.length !== 3) throw new Error("Payload chiffre invalide");
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
