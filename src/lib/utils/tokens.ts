import { randomBytes, createHash } from "crypto";

export function generateToken(length: number = 32): string {
  return randomBytes(length).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSecureToken(): { token: string; hashedToken: string } {
  const token = generateToken(32);
  const hashedToken = hashToken(token);
  return { token, hashedToken };
}

export function verifyToken(token: string, hashedToken: string): boolean {
  const hashed = hashToken(token);
  return hashed === hashedToken;
}

export function generateInviteToken(): string {
  return generateToken(24);
}

export function generateReviewToken(): string {
  return generateToken(32);
}
