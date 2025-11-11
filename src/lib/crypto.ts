import crypto from "crypto";

export type ScryptParams = { N: number; r: number; p: number; keylen: number };

const defaultParams: ScryptParams = { N: 2 ** 15, r: 8, p: 1, keylen: 32 }; // 比 bcrypt 成本更高，抗 GPU 更好

export async function hashPassword(plain: string, params: ScryptParams = defaultParams) {
  const salt = crypto.randomBytes(16);
  const derived = await scryptAsync(plain, salt, params);
  return {
    saltB64: salt.toString("base64"),
    hashB64: derived.toString("base64"),
    params,
  };
}

export async function verifyPassword(plain: string, saltB64: string, hashB64: string, paramsJson: string) {
  const params: ScryptParams = JSON.parse(paramsJson);
  const salt = Buffer.from(saltB64, "base64");
  const derived = await scryptAsync(plain, salt, params);
  const stored = Buffer.from(hashB64, "base64");
  return timingSafeEqual(derived, stored);
}

function scryptAsync(password: string, salt: Buffer, params: ScryptParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, params.keylen, { N: params.N, r: params.r, p: params.p }, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });
}

function timingSafeEqual(a: Buffer, b: Buffer) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
