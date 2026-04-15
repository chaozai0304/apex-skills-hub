import { createHash } from "node:crypto";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function hashPassword(password: string, secret: string) {
  return sha256(`${password}:${secret}`);
}
