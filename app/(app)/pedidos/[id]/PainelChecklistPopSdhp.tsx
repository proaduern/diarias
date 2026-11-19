"use client";

import { useState, useTransition } from "react";
import { atualizarChecklistPopSdhpAction } from "@/lib/actions/pedidos";
import { desempacotar } from "@/lib/actions/resultado";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

interface PainelChecklistPopSdhpProps {
  viagemId: string;
  ehAdmin: boolean;
  ehConvenio: boolean;
  temDiaria: boolean;
  temPassagem: boolean;
  temHospedagem: boolean;
  jouernPublicado: boolean;
  jouernEdicao: string | null;
  esocialCadastrado: boolean;
  sigefPrestacaoContas: boolean;
  obtvTransferegovNumero: string | null;
  ordemServicoPassagem: string | null;
  bilheteLocalizador: string | null;
  ordemServicoHospedagem: string | null;
}

export default function PainelChecklistPopSdhp({
  viagemId,
  ehAdmin,
  ehConvenio,
  temDiaria,
  temPassagem,
  temHospedagem,
  jouernPublicado,
  jouernEdicao,
  esocialCadastrado,
  sigefPrestacaoContas,
  obtvTransferegovNumero,
  ordemServicoPassagem,
  bilheteLocalizador,
  ordemServicoHospedagem,
}: PainelChecklistPopSdhpProps) {
  const [isPending, startTransition] = useTransition();
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const popsAplicaveis: string[] = [];
  if (temDiaria && !ehConvenio) popsAplicaveis.push("POP 03 (Concessão de Diárias)");
  if (temDiaria && ehConvenio) popsAplicaveis.push("POP 04 (Diárias — Convênios Federais / Decreto 5.992/2006)");
  if (temPassagem) popsAplicaveis.push("POP 05 (Emissão de Passagens Aéreas)");
  if (temHospedagem) popsAplicaveis.push("POP 06 (Hospedagem)");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-800 uppercase tracking-wide">
          <ShieldCheck className="h-3.5 w-3.5 text-[#003366]" />
          Conformidade Processual SDHP/PROAD — {popsAplicaveis.join(" • ")}
        </span>
        <h2 className="text-sm font-bold text-slate-900 mt-1">
          Checklist Operacional de Instrução e Controle (JOUERN, e-Social, SIGEF, OS e Transferegov)
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Acompanhamento das etapas obrigatórias de instrução e liquidação previstas nos Procedimentos Operacionais Padrões (POPs 03, 04, 05 e 06) do SDHP/PROAD/UERN.
        </p>
      </div>

      {ehAdmin ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErro(null);
            setSucesso(false);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                desempacotar(await atualizarChecklistPopSdhpAction(viagemId, fd));
                setSucesso(true);
              } catch (err) {
                setErro(err instanceof Error ? err.message : "Erro ao salvar checklist.");
              }
            });
          }}
          className="space-y-3 text-xs"
        >
          {temDiaria && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  name="jouernPublicado"
                  defaultChecked={jouernPublicado}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <span>Portaria publicada no JOUERN (Etapa 7/9 POP 03)</span>
              </label>

              <div>
                <input
                  name="jouernEdicao"
                  defaultValue={jouernEdicao ?? ""}
                  placeholder="Nº / Data da Edição do JOUERN"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                />
              </div>

              <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  name="esocialCadastrado"
                  defaultChecked={esocialCadastrado}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <span>Diária cadastrada no sistema e-Social (Etapa 30 POP 03)</span>
              </label>

              <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  name="sigefPrestacaoContas"
                  defaultChecked={sigefPrestacaoContas}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <span>Prestação de Contas baixada no SIGEF (Etapa 29 POP 03)</span>
              </label>

              {ehConvenio && (
                <div className="sm:col-span-2">
                  <label className="mb-1 block font-semibold text-slate-700">
                    Nº da OBTV / Plataforma Transferegov (POP 04 — Convênios Federais)
                  </label>
                  <input
                    name="obtvTransferegovNumero"
                    defaultValue={obtvTransferegovNumero ?? ""}
                    placeholder="Ex.: OBTV 2026OB800123 - Transferegov"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
              )}
            </div>
          )}

          {temPassagem && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Nº da Ordem de Serviço de Passagem Aérea (Etapa 3.2 POP 05)
                </label>
                <input
                  name="ordemServicoPassagem"
                  defaultValue={ordemServicoPassagem ?? ""}
                  placeholder="Ex.: OS nº 015/2026 - SDHP"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Localizador / Nº do Bilhete Eletrônico Emitido (Etapa 12 POP 05)
                </label>
                <input
                  name="bilheteLocalizador"
                  defaultValue={bilheteLocalizador ?? ""}
                  placeholder="Ex.: LATAM / GOL - Localizador ABC123"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                />
              </div>
            </div>
          )}

          {temHospedagem && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <label className="mb-1 block font-semibold text-slate-700">
                Nº da Ordem de Serviço / Confirmação de Reserva de Hospedagem (Etapa 3.3 / 12 POP 06)
              </label>
              <input
                name="ordemServicoHospedagem"
                defaultValue={ordemServicoHospedagem ?? ""}
                placeholder="Ex.: OS Hospedagem nº 008/2026 - Voucher Confirmado"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
              />
            </div>
          )}

          {erro && (
            <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-red-700">
              {erro}
            </p>
          )}
          {sucesso && (
            <p className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-emerald-800 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span>Checklist POP atualizado com sucesso!</span>
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-[#003366] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#002244] disabled:opacity-60 cursor-pointer"
            >
              {isPending ? "Salvando..." : "Atualizar Checklist SDHP (POPs 03 a 06)"}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          {temDiaria && (
            <>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                <span className="text-slate-500 block">Publicação JOUERN (POP 03):</span>
                <strong className="text-slate-800">
                  {jouernPublicado ? `✓ Publicada (${jouernEdicao || "JOUERN"})` : "Em tramitação"}
                </strong>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                <span className="text-slate-500 block">Cadastro e-Social (POP 03):</span>
                <strong className="text-slate-800">
                  {esocialCadastrado ? "✓ Cadastrado no e-Social" : "Pendente pós-pagamento"}
                </strong>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                <span className="text-slate-500 block">Baixa SIGEF (POP 03):</span>
                <strong className="text-slate-800">
                  {sigefPrestacaoContas ? "✓ Baixado no SIGEF" : "Aguardando análise do relatório"}
                </strong>
              </div>
            </>
          )}
          {temPassagem && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
              <span className="text-slate-500 block">OS / Bilhete Passagem (POP 05):</span>
              <strong className="text-slate-800">
                {ordemServicoPassagem || bilheteLocalizador
                  ? `${ordemServicoPassagem || "OS emitida"} ${bilheteLocalizador ? `• Loc: ${bilheteLocalizador}` : ""}`
                  : "Em emissão pelo SDHP"}
              </strong>
            </div>
          )}
          {temHospedagem && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
              <span className="text-slate-500 block">OS Hospedagem (POP 06):</span>
              <strong className="text-slate-800">
                {ordemServicoHospedagem || "Em reserva pelo SDHP"}
              </strong>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
