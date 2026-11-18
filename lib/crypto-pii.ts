import crypto from "crypto";

const RAW_KEY =
  process.env.DATA_ENCRYPTION_KEY ||
  process.env.PROAD_SSO_SECRET ||
  "uern_portal_proad_sso_master_key_2026_super_seguro";

const AES_KEY = crypto.createHash("sha256").update(RAW_KEY).digest();
const PREFIX = "enc:v1:";

export function encryptPii(
  value: string | null | undefined,
  deterministic = false,
): string | null | undefined {
  if (value === null || value === undefined || typeof value !== "string" || value.trim() === "") {
    return value;
  }
  if (value.startsWith(PREFIX)) return value;

  const iv = deterministic
    ? crypto.createHmac("sha256", AES_KEY).update(value).digest().subarray(0, 12)
    : crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", AES_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptPii(value: string | null | undefined): string | null | undefined {
  if (value === null || value === undefined || typeof value !== "string") {
    return value;
  }
  if (!value.startsWith(PREFIX)) return value;

  try {
    const parts = value.slice(PREFIX.length).split(":");
    if (parts.length !== 3) return value;

    const [ivHex, tagHex, dataHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const encrypted = Buffer.from(dataHex, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", AES_KEY, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return value;
  }
}

export function encryptFieldsInData(
  data: any,
  deterministicFields: string[],
  randomFields: string[],
) {
  if (!data || typeof data !== "object") return data;
  const copy = { ...data };
  for (const field of deterministicFields) {
    if (typeof copy[field] === "string") copy[field] = encryptPii(copy[field], true);
  }
  for (const field of randomFields) {
    if (typeof copy[field] === "string") copy[field] = encryptPii(copy[field], false);
  }
  return copy;
}

export function encryptWhereUnique(where: any, deterministicFields: string[]) {
  if (!where || typeof where !== "object") return where;
  const copy = { ...where };
  for (const field of deterministicFields) {
    if (typeof copy[field] === "string") copy[field] = encryptPii(copy[field], true);
  }
  return copy;
}

const ALL_PII_FIELDS = ["cpf", "banco", "agencia", "contaCorrente", "matricula"];

export function decryptDeepPii(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(decryptDeepPii);
  if (obj instanceof Date || Buffer.isBuffer(obj) || obj instanceof Uint8Array) return obj;
  // Preserve Prisma Decimal objects
  if ("d" in obj && "e" in obj && "s" in obj) return obj;

  const copy: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (ALL_PII_FIELDS.includes(k) && typeof v === "string") {
      copy[k] = decryptPii(v);
    } else if (v && typeof v === "object") {
      copy[k] = decryptDeepPii(v);
    } else {
      copy[k] = v;
    }
  }
  return copy;
}
