import { PrismaClient } from "@prisma/client";
import { encryptFieldsInData, encryptWhereUnique, decryptDeepPii } from "./crypto-pii";

function otimizarDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes("neon.tech") && !url.hostname.includes("-pooler")) {
      url.hostname = url.hostname.replace(/^([^.]+)/, "$1-pooler");
    }
    if (url.hostname.includes("-pooler")) {
      if (!url.searchParams.has("pgbouncer")) url.searchParams.set("pgbouncer", "true");
      if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "5");
      if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "20");
      if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "15");
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

const USUARIO_DET = ["cpf"];
const BENEF_DET = ["cpf"];
const BENEF_RND = ["banco", "agencia", "contaCorrente", "matricula"];

function createPrismaClient() {
  const pooledUrl = otimizarDatabaseUrl(process.env.DATABASE_URL);
  const baseClient = new PrismaClient({
    ...(pooledUrl ? { datasources: { db: { url: pooledUrl } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return baseClient.$extends({
    query: {
      usuario: {
        async findUnique({ args, query }) {
          if (args.where) args.where = encryptWhereUnique(args.where, USUARIO_DET);
          return decryptDeepPii(await query(args));
        },
        async findFirst({ args, query }) {
          if (args.where) args.where = encryptWhereUnique(args.where, USUARIO_DET);
          return decryptDeepPii(await query(args));
        },
        async findMany({ args, query }) {
          if (args.where) args.where = encryptWhereUnique(args.where, USUARIO_DET);
          return decryptDeepPii(await query(args));
        },
        async create({ args, query }) {
          args.data = encryptFieldsInData(args.data, USUARIO_DET, []);
          return decryptDeepPii(await query(args));
        },
        async update({ args, query }) {
          if (args.where) args.where = encryptWhereUnique(args.where, USUARIO_DET);
          args.data = encryptFieldsInData(args.data, USUARIO_DET, []);
          return decryptDeepPii(await query(args));
        },
        async upsert({ args, query }) {
          if (args.where) args.where = encryptWhereUnique(args.where, USUARIO_DET);
          args.create = encryptFieldsInData(args.create, USUARIO_DET, []);
          args.update = encryptFieldsInData(args.update, USUARIO_DET, []);
          return decryptDeepPii(await query(args));
        },
      },
      beneficiario: {
        async findUnique({ args, query }) {
          if (args.where) args.where = encryptWhereUnique(args.where, BENEF_DET);
          return decryptDeepPii(await query(args));
        },
        async findUniqueOrThrow({ args, query }) {
          if (args.where) args.where = encryptWhereUnique(args.where, BENEF_DET);
          return decryptDeepPii(await query(args));
        },
        async findFirst({ args, query }) {
          if (args.where) args.where = encryptWhereUnique(args.where, BENEF_DET);
          return decryptDeepPii(await query(args));
        },
        async findMany({ args, query }) {
          if (args.where) args.where = encryptWhereUnique(args.where, BENEF_DET);
          return decryptDeepPii(await query(args));
        },
        async create({ args, query }) {
          args.data = encryptFieldsInData(args.data, BENEF_DET, BENEF_RND);
          return decryptDeepPii(await query(args));
        },
        async update({ args, query }) {
          if (args.where) args.where = encryptWhereUnique(args.where, BENEF_DET);
          args.data = encryptFieldsInData(args.data, BENEF_DET, BENEF_RND);
          return decryptDeepPii(await query(args));
        },
        async upsert({ args, query }) {
          if (args.where) args.where = encryptWhereUnique(args.where, BENEF_DET);
          args.create = encryptFieldsInData(args.create, BENEF_DET, BENEF_RND);
          args.update = encryptFieldsInData(args.update, BENEF_DET, BENEF_RND);
          return decryptDeepPii(await query(args));
        },
      },
      viagem: {
        async findUnique({ args, query }) {
          return decryptDeepPii(await query(args));
        },
        async findFirst({ args, query }) {
          return decryptDeepPii(await query(args));
        },
        async findMany({ args, query }) {
          return decryptDeepPii(await query(args));
        },
      },
      pedidoDiaria: {
        async findUnique({ args, query }) {
          return decryptDeepPii(await query(args));
        },
        async findUniqueOrThrow({ args, query }) {
          return decryptDeepPii(await query(args));
        },
        async findMany({ args, query }) {
          return decryptDeepPii(await query(args));
        },
      },
    },
  });
}

export type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma?: ExtendedPrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
export default prisma;
