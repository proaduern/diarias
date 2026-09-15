/** Validação de CNPJ (dígito verificador), mesmo padrão de lib/cpf.ts. */

export function normalizarCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

export function cnpjValido(cnpjBruto: string): boolean {
  const cnpj = normalizarCnpj(cnpjBruto);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false; // todos os dígitos iguais

  const digitos = cnpj.split("").map(Number);

  const calcularDigito = (base: number[]): number => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += base[i] * pesos[i];
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const dv1 = calcularDigito(digitos.slice(0, 12));
  const dv2 = calcularDigito(digitos.slice(0, 13));

  return dv1 === digitos[12] && dv2 === digitos[13];
}
