import crypto from "crypto";

export type ScryptParams = { N: number; r: number; p: number; keylen: number };

// 在本地/开发环境用较强参数；在无服务器生产用稍低参数（更快，仍安全）
const isProd = process.env.NODE_ENV === "production";

// 生产：2**12 ；开发：2**14
const defaultParams: ScryptParams = {
  N: isProd ? 2 ** 12 : 2 ** 14,
  r: 8,
  p: 1,
  keylen: 32,
};

export async function hashPassword(plain: string, params: ScryptParams = defaultParams) {
  const salt = crypto.randomBytes(16);
  const derived = await scryptAsync(plain, salt, params);
  return {
    saltB64: salt.toString("base64"),
    hashB64: derived.toString("base64"),
    params,
  };
}

export async function verifyPassword(
  plain: string,
  saltB64: string,
  hashB64: string,
  paramsJson: string
) {
  const params: ScryptParams = JSON.parse(paramsJson);
  const salt = Buffer.from(saltB64, "base64");
  const derived = await scryptAsync(plain, salt, params);
  const stored = Buffer.from(hashB64, "base64");
  return timingSafeEqual(derived, stored);
}

function scryptAsync(password: string, salt: Buffer, params: ScryptParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      params.keylen,
      { N: params.N, r: params.r, p: params.p },
      (err, key) => (err ? reject(err) : resolve(key as Buffer))
    );
  });
}

function timingSafeEqual(a: Buffer, b: Buffer) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
