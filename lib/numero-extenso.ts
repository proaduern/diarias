/**
 * Números por extenso em português, usados na geração de documentos oficiais
 * (portaria de concessão de diárias). Cobre apenas o que os documentos
 * realmente precisam: valores monetários (reais/centavos) e quantidade de
 * diárias (inteiro ou inteiro + meia).
 */

type Genero = "M" | "F";

const UNIDADES: Record<Genero, string[]> = {
  M: ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"],
  F: ["zero", "uma", "duas", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"],
};

const DEZ_A_DEZENOVE = [
  "dez",
  "onze",
  "doze",
  "treze",
  "catorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];

const DEZENAS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];

const CENTENAS: Record<Genero, string[]> = {
  M: ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"],
  F: ["", "cento", "duzentas", "trezentas", "quatrocentas", "quinhentas", "seiscentas", "setecentas", "oitocentas", "novecentas"],
};

function extensoDeDezena(n: number, genero: Genero): string {
  if (n < 10) return UNIDADES[genero][n];
  if (n < 20) return DEZ_A_DEZENOVE[n - 10];
  const dezena = Math.floor(n / 10);
  const unidade = n % 10;
  if (unidade === 0) return DEZENAS[dezena];
  return `${DEZENAS[dezena]} e ${UNIDADES[genero][unidade]}`;
}

/** n entre 0 e 999. */
function extensoDeCentena(n: number, genero: Genero): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const centena = Math.floor(n / 100);
  const resto = n % 100;
  if (centena === 0) return extensoDeDezena(resto, genero);
  if (resto === 0) return CENTENAS[genero][centena];
  return `${CENTENAS[genero][centena]} e ${extensoDeDezena(resto, genero)}`;
}

/**
 * Converte um inteiro de 0 a 999999 para extenso em português.
 * `genero` concorda apenas a parte das unidades/centenas — o milhar é
 * sempre tratado no masculino, pois concorda com "mil" ("duzentos mil",
 * nunca "duzentas mil").
 */
export function numeroPorExtenso(valor: number, genero: Genero = "M"): string {
  if (!Number.isInteger(valor) || valor < 0 || valor > 999999) {
    throw new Error(`numeroPorExtenso: valor fora do intervalo suportado (0-999999): ${valor}`);
  }
  if (valor === 0) return "zero";

  const milhar = Math.floor(valor / 1000);
  const resto = valor % 1000;

  let parteMilhar = "";
  if (milhar > 0) {
    parteMilhar = milhar === 1 ? "mil" : `${extensoDeCentena(milhar, "M")} mil`;
  }

  if (milhar > 0 && resto === 0) return parteMilhar;
  if (milhar === 0) return extensoDeCentena(resto, genero);

  // Duas parte (milhar + resto): "e" liga a última parte quando ela é menor
  // que 100 ou é uma centena redonda (ex.: "mil e cem", "mil e cinquenta"),
  // mas não quando a centena tem dezena/unidade própria (ex.: "mil duzentos
  // e cinquenta", sem "e" antes de "duzentos").
  const conector = resto < 100 || resto % 100 === 0 ? " e " : " ";
  return `${parteMilhar}${conector}${extensoDeCentena(resto, genero)}`;
}

/** Valor monetário em centavos -> extenso com "real(is)"/"centavo(s)". */
export function valorPorExtenso(valorCentavos: number): string {
  if (!Number.isInteger(valorCentavos) || valorCentavos < 0) {
    throw new Error(`valorPorExtenso: valor inválido: ${valorCentavos}`);
  }

  const reais = Math.floor(valorCentavos / 100);
  const centavos = valorCentavos % 100;

  if (reais === 0 && centavos === 0) return "zero reais";

  const partes: string[] = [];
  if (reais > 0) {
    partes.push(`${numeroPorExtenso(reais, "M")} ${reais === 1 ? "real" : "reais"}`);
  }
  if (centavos > 0) {
    partes.push(`${numeroPorExtenso(centavos, "M")} ${centavos === 1 ? "centavo" : "centavos"}`);
  }
  return partes.join(" e ");
}

/**
 * Quantidade de diárias (inteiro ou inteiro + meia, ex.: 1, 1.5, 2.5) no
 * formato usado na portaria: "1 e 1/2 (uma e meia)". Concorda em feminino
 * ("diária" é feminino). Qualquer fração diferente de ,5 é um erro de dado
 * upstream (o motor de cálculo só produz inteiros ou meias-diárias) e lança.
 */
export function diariasPorExtenso(diarias: number): string {
  const emMeios = Math.round(diarias * 2);
  if (Math.abs(emMeios - diarias * 2) > 1e-9) {
    throw new Error(`diariasPorExtenso: valor não é múltiplo de 0,5: ${diarias}`);
  }

  const inteiro = Math.floor(emMeios / 2);
  const temMeia = emMeios % 2 !== 0;

  if (inteiro === 0 && temMeia) return "1/2 (meia)";
  if (!temMeia) return `${inteiro} (${numeroPorExtenso(inteiro, "F")})`;
  return `${inteiro} e 1/2 (${numeroPorExtenso(inteiro, "F")} e meia)`;
}
