import "server-only";

import crypto from "node:crypto";
import { readEnvironmentValue } from "@/lib/environment";

const PASSWORD_LENGTH_BYTES = 32;
const ENCRYPTION_ALGORITHM = "aes-256-gcm";

export type EncryptedPhonePassword = {
  ciphertext: string;
  iv: string;
  tag: string;
};

function getSecretKey() {
  const secret = readEnvironmentValue("PHONE_AUTH_CREDENTIALS_SECRET");

  if (!secret) {
    return null;
  }

  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

export function generateSecurePhonePassword() {
  return crypto.randomBytes(PASSWORD_LENGTH_BYTES).toString("base64url");
}

export function encryptPhonePassword(password: string): EncryptedPhonePassword | null {
  const key = getSecretKey();
  if (!key) {
    return null;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptPhonePassword(value: EncryptedPhonePassword) {
  const key = getSecretKey();
  if (!key) {
    return null;
  }

  try {
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      key,
      Buffer.from(value.iv, "base64"),
    );

    decipher.setAuthTag(Buffer.from(value.tag, "base64"));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(value.ciphertext, "base64")),
      decipher.final(),
    ]);

    return plaintext.toString("utf8");
  } catch {
    return null;
  }
}
