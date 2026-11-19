import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export type TipoSequencialSdhp =
  | "DIARIA"
  | "PASSAGEM_AEREA"
  | "HOSPEDAGEM"
  | "TERMO_RETIFICACAO"
  | "FICHA_ESOCIAL";

export function obterRotuloTipoSdhp(tipo: TipoSequencialSdhp | string): string {
  const t = (tipo || "").toUpperCase().trim();
  switch (t) {
    case "DIARIA":
      return "Solicitação de Diárias";
    case "PASSAGEM_AEREA":
      return "Solicitação de Passagens Aéreas";
    case "HOSPEDAGEM":
      return "Solicitação de Hospedagem";
    case "TERMO_RETIFICACAO":
      return "Termo de Retificação";
    case "FICHA_ESOCIAL":
      return "Formulário de Cadastro eSocial";
    default:
      return "Solicitação SDHP";
  }
}

export function obterSiglaCurtaSdhp(tipo: TipoSequencialSdhp | string): string {
  const t = (tipo || "").toUpperCase().trim();
  switch (t) {
    case "DIARIA":
      return "SD";
    case "PASSAGEM_AEREA":
      return "SPA";
    case "HOSPEDAGEM":
      return "SH";
    case "TERMO_RETIFICACAO":
      return "TR";
    case "FICHA_ESOCIAL":
      return "ES";
    default:
      return "DOC";
  }
}

export function formatarTextoSequencialSdhp(
  tipo: TipoSequencialSdhp | string,
  numero: number,
  ano: number,
): string {
  const numFormatado = String(numero).padStart(3, "0");
  const rotulo = obterRotuloTipoSdhp(tipo);
  return `${rotulo} nº ${numFormatado}/${ano} - SDHP/PROAD/UERN`;
}

/**
 * Reserva e incrementa de forma ATÔMICA o sequencial anual próprio de cada modalidade
 * (Diárias, Passagens Aéreas, Hospedagem) no PostgreSQL.
 */
export async function reservarProximoSequencialSdhp(
  tipo: TipoSequencialSdhp,
  anoParam?: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbClient: any = prisma,
) {
  const t = tipo.toUpperCase().trim();
  const ano = anoParam || new Date().getFullYear();
  const newId = crypto.randomUUID();

  let numeroReservado = 1;

  try {
    const rows = await dbClient.$queryRawUnsafe(
      `
      INSERT INTO "sequenciais_documentos_sdhp" ("id", "tipo", "ano", "ultimoNumero", "updatedAt")
      VALUES ($1, $2, $3, 1, NOW())
      ON CONFLICT ("tipo", "ano")
      DO UPDATE SET
        "ultimoNumero" = "sequenciais_documentos_sdhp"."ultimoNumero" + 1,
        "updatedAt" = NOW()
      RETURNING "ultimoNumero"
      `,
      newId,
      t,
      ano,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    numeroReservado = Number((rows as any)?.[0]?.ultimoNumero ?? 1);
  } catch {
    // Fallback caso a tabela esteja no schema diarias explícito
    try {
      const rows2 = await dbClient.$queryRawUnsafe(
        `
        INSERT INTO diarias."sequenciais_documentos_sdhp" ("id", "tipo", "ano", "ultimoNumero", "updatedAt")
        VALUES ($1, $2, $3, 1, NOW())
        ON CONFLICT ("tipo", "ano")
        DO UPDATE SET
          "ultimoNumero" = diarias."sequenciais_documentos_sdhp"."ultimoNumero" + 1,
          "updatedAt" = NOW()
        RETURNING "ultimoNumero"
        `,
        newId,
        t,
        ano,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      numeroReservado = Number((rows2 as any)?.[0]?.ultimoNumero ?? 1);
    } catch {
      numeroReservado = 1;
    }
  }

  const numeroFormatado = String(numeroReservado).padStart(3, "0");
  const sigla = obterSiglaCurtaSdhp(t);

  return {
    tipo: t,
    ano,
    numero: numeroReservado,
    numeroFormatado,
    identificadorCurto: `${sigla}-${numeroFormatado}/${ano}`,
    codigoVerificador: `SDHP-${sigla}-${ano}-${numeroFormatado}`,
    sequencialFormatado: formatarTextoSequencialSdhp(t, numeroReservado, ano),
  };
}

/**
 * Garante que todos os pedidos vinculados a uma viagem possuam sequencial próprio persistido.
 * Útil para retrocompatibilidade com viagens criadas antes da implantação do contador.
 */
export async function garantirSequenciaisViagem(viagemId: string) {
  const viagem = await prisma.viagem.findUnique({
    where: { id: viagemId },
    include: {
      pedidosDiaria: true,
      pedidosHospedagem: true,
      pedidosPassagemAerea: true,
    },
  });

  if (!viagem) return null;

  const anoRef = viagem.createdAt.getFullYear();

  for (const pd of viagem.pedidosDiaria) {
    if (!pd.sequencialFormatado) {
      const seq = await reservarProximoSequencialSdhp("DIARIA", anoRef);
      await prisma.pedidoDiaria.update({
        where: { id: pd.id },
        data: {
          sequencialNumero: seq.numero,
          sequencialAno: seq.ano,
          sequencialFormatado: seq.sequencialFormatado,
        },
      });
      pd.sequencialNumero = seq.numero;
      pd.sequencialAno = seq.ano;
      pd.sequencialFormatado = seq.sequencialFormatado;
    }
  }

  for (const pp of viagem.pedidosPassagemAerea) {
    if (!pp.sequencialFormatado) {
      const seq = await reservarProximoSequencialSdhp("PASSAGEM_AEREA", anoRef);
      await prisma.pedidoPassagemAerea.update({
        where: { id: pp.id },
        data: {
          sequencialNumero: seq.numero,
          sequencialAno: seq.ano,
          sequencialFormatado: seq.sequencialFormatado,
        },
      });
      pp.sequencialNumero = seq.numero;
      pp.sequencialAno = seq.ano;
      pp.sequencialFormatado = seq.sequencialFormatado;
    }
  }

  for (const ph of viagem.pedidosHospedagem) {
    if (!ph.sequencialFormatado) {
      const seq = await reservarProximoSequencialSdhp("HOSPEDAGEM", anoRef);
      await prisma.pedidoHospedagem.update({
        where: { id: ph.id },
        data: {
          sequencialNumero: seq.numero,
          sequencialAno: seq.ano,
          sequencialFormatado: seq.sequencialFormatado,
        },
      });
      ph.sequencialNumero = seq.numero;
      ph.sequencialAno = seq.ano;
      ph.sequencialFormatado = seq.sequencialFormatado;
    }
  }

  return viagem;
}
