export function formatarCpf(cpf: string): string {
  const digitos = cpf.replace(/\D/g, "").padStart(11, "0");
  return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatarCnpj(cnpj: string): string {
  const digitos = cnpj.replace(/\D/g, "").padStart(14, "0");
  return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

export function formatarMoeda(valorCentavos: number, moeda: string): string {
  const valor = valorCentavos / 100;
  const simbolo = moeda === "USD" ? "US$" : "R$";
  return `${simbolo} ${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatarDataHora(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

export function formatarData(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(data);
}

const MESES_POR_EXTENSO = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "14 de setembro de 2026" — usado em documentos oficiais (portaria). */
export function formatarDataPorExtenso(data: Date): string {
  const dia = new Intl.DateTimeFormat("pt-BR", { day: "numeric" }).format(data);
  const mes = MESES_POR_EXTENSO[data.getMonth()];
  const ano = new Intl.DateTimeFormat("pt-BR", { year: "numeric" }).format(data);
  return `${dia} de ${mes} de ${ano}`;
}

export function formatarDiarias(diarias: number | null | undefined): string {
  if (diarias == null) return "-";
  return diarias.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}
