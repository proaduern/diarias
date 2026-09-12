/** Validação e comparação de CPF. */

export function normalizarCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

export function cpfValido(cpfBruto: string): boolean {
  const cpf = normalizarCpf(cpfBruto);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos os dígitos iguais

  const digitos = cpf.split("").map(Number);

  const calcularDigito = (base: number[]): number => {
    let soma = 0;
    let peso = base.length + 1;
    for (const d of base) {
      soma += d * peso;
      peso--;
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const dv1 = calcularDigito(digitos.slice(0, 9));
  const dv2 = calcularDigito(digitos.slice(0, 10));

  return dv1 === digitos[9] && dv2 === digitos[10];
}

/** Distância de Hamming entre dois CPFs normalizados (mesmo comprimento, 11 dígitos). */
export function distanciaHammingCpf(cpfA: string, cpfB: string): number {
  const a = normalizarCpf(cpfA);
  const b = normalizarCpf(cpfB);
  if (a.length !== 11 || b.length !== 11) {
    // CPF malformado não é comparável por Hamming — trate como "totalmente diferente".
    return 11;
  }
  let distancia = 0;
  for (let i = 0; i < 11; i++) {
    if (a[i] !== b[i]) distancia++;
  }
  return distancia;
}

export function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}

export type ResultadoDedupBeneficiario =
  | { tipo: "CPF_IDENTICO" }
  | { tipo: "PROVAVEL_ERRO_DIGITACAO"; distanciaCpf: number }
  | { tipo: "OK" };

/**
 * Regras de deduplicação de beneficiário (fechadas na especificação):
 * - CPF idêntico a um já cadastrado -> bloqueia.
 * - Nome normalizado idêntico + CPF com distância de Hamming de 1 ou 2 -> bloqueia
 *   (provável erro de digitação).
 * - Nome idêntico + CPF com distância > 2 -> permite (homônimos).
 */
export function checarDuplicidadeBeneficiario(
  novo: { nome: string; cpf: string },
  existente: { nome: string; cpf: string },
): ResultadoDedupBeneficiario {
  const cpfNovo = normalizarCpf(novo.cpf);
  const cpfExistente = normalizarCpf(existente.cpf);

  if (cpfNovo === cpfExistente) {
    return { tipo: "CPF_IDENTICO" };
  }

  const mesmoNome = normalizarNome(novo.nome) === normalizarNome(existente.nome);
  if (mesmoNome) {
    const distancia = distanciaHammingCpf(cpfNovo, cpfExistente);
    if (distancia >= 1 && distancia <= 2) {
      return { tipo: "PROVAVEL_ERRO_DIGITACAO", distanciaCpf: distancia };
    }
  }

  return { tipo: "OK" };
}
