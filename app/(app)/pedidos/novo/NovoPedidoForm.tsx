"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { criarViagemComPedidosAction, type CriarViagemState } from "@/lib/actions/viagens";
import { carregarRascunho, formDataParaRascunho, limparRascunho, salvarRascunho } from "./rascunho";
import AtividadesFormSection from "./AtividadesFormSection";
import SedeDestinoAeroportoSection from "./SedeDestinoAeroportoSection";
import type {
  Beneficiario,
  CategoriaBeneficiario,
  Contrato,
  EnquadramentoAtividade,
  TipoDestino,
  Unidade,
} from "@prisma/client";

const initialState: CriarViagemState = {};

type BeneficiarioComCategoria = Beneficiario & {
  categoria: Pick<CategoriaBeneficiario, "elegivelHospedagem">;
};

export default function NovoPedidoForm({
  usuarioId,
  beneficiarios,
  tiposDestino,
  unidades,
  enquadramentos,
  ehAdmin,
  prazoMinimoDias,
  kmMinimo,
  contratosHospedagem,
  contratosPassagemAerea,
}: {
  usuarioId: string;
  beneficiarios: BeneficiarioComCategoria[];
  tiposDestino: TipoDestino[];
  unidades: Unidade[];
  enquadramentos: EnquadramentoAtividade[];
  ehAdmin: boolean;
  prazoMinimoDias: number;
  kmMinimo: number;
  contratosHospedagem: Contrato[];
  contratosPassagemAerea: Contrato[];
}) {
  const [state, formAction, pending] = useActionState(criarViagemComPedidosAction, initialState);
  const [beneficiarioId, setBeneficiarioId] = useState("");
  const [querHospedagem, setQuerHospedagem] = useState(false);
  const [querPassagemAerea, setQuerPassagemAerea] = useState(false);

  const beneficiarioSelecionado = beneficiarios.find((b) => b.id === beneficiarioId);
  const elegivelHospedagem = beneficiarioSelecionado?.categoria.elegivelHospedagem ?? false;

  const formRef = useRef<HTMLFormElement>(null);
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rascunho, setRascunho] = useState<Record<string, string> | null>(null);
  const [rascunhoRestaurado, setRascunhoRestaurado] = useState(false);

  // Carrega o rascunho salvo no navegador (se houver) assim que a página
  // monta. Precisa ser em efeito (não em useState lazy) porque localStorage
  // não existe durante o SSR — ler aqui, só no cliente, evita divergir do
  // HTML renderizado no servidor.
  useEffect(() => {
    const salvo = carregarRascunho(usuarioId);
    if (salvo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com localStorage, só existe no cliente
      setRascunho(salvo);
      setRascunhoRestaurado(true);
    }
  }, [usuarioId]);

  // Restaura os campos controlados por este componente e, no próximo tick
  // (depois que os componentes filhos já tiverem recriado suas próprias
  // linhas/seções condicionais a partir do mesmo rascunho), preenche os
  // demais campos do formulário diretamente no DOM. Arquivos nunca são
  // restaurados — o navegador não permite, e por segurança não deveria.
  useEffect(() => {
    if (!rascunho) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com o rascunho carregado acima
    setBeneficiarioId(rascunho.beneficiarioId ?? "");
    setQuerHospedagem(rascunho.tipoHospedagem === "on");
    setQuerPassagemAerea(rascunho.tipoPassagemAerea === "on");

    const camposControladosAqui = new Set(["beneficiarioId", "tipoHospedagem", "tipoPassagemAerea"]);

    const timer = setTimeout(() => {
      const form = formRef.current;
      if (!form) return;
      for (const [nome, valor] of Object.entries(rascunho)) {
        if (camposControladosAqui.has(nome)) continue;
        const campo = form.elements.namedItem(nome);
        if (!campo || campo instanceof RadioNodeList) continue;
        if (campo instanceof HTMLInputElement) {
          if (campo.type === "file") continue;
          if (campo.type === "checkbox") {
            campo.checked = valor === "on";
          } else {
            campo.value = valor;
          }
        } else if (campo instanceof HTMLTextAreaElement || campo instanceof HTMLSelectElement) {
          campo.value = valor;
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [rascunho]);

  function agendarAutosave() {
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      const form = formRef.current;
      if (!form) return;
      salvarRascunho(usuarioId, formDataParaRascunho(new FormData(form)));
    }, 500);
  }

  function descartarRascunho() {
    limparRascunho(usuarioId);
    window.location.reload();
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onChange={agendarAutosave}
      onSubmit={() => limparRascunho(usuarioId)}
      className="max-w-2xl space-y-4 rounded-2xl border border-slate-100 bg-white shadow-sm p-6"
    >
      <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Suas respostas ficam salvas automaticamente neste navegador enquanto
        você preenche — se precisar sair da tela ou do sistema, pode
        continuar de onde parou ao voltar (exceto arquivos anexados, que
        precisam ser selecionados de novo).
      </p>

      {rascunhoRestaurado && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          <span>Um rascunho salvo anteriormente foi restaurado.</span>
          <button
            type="button"
            onClick={descartarRascunho}
            className="whitespace-nowrap font-medium underline"
          >
            Descartar e começar do zero
          </button>
        </div>
      )}
      {ehAdmin && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Unidade solicitante
          </label>
          <select
            name="unidadeSolicitanteId"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecione...</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Beneficiário
        </label>
        <select
          name="beneficiarioId"
          required
          value={beneficiarioId}
          onChange={(e) => setBeneficiarioId(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Selecione...</option>
          {beneficiarios.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Finalidade da viagem
        </label>
        <input
          name="finalidade"
          required
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Município de destino
          </label>
          <input
            name="municipioDestino"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Tipo de destino (para fins de valor de diária)
          </label>
          <select
            name="tipoDestinoId"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecione...</option>
            {tiposDestino.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <SedeDestinoAeroportoSection valoresIniciais={rascunho ?? undefined} />

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Distância da sede ao destino (km)
        </label>
        <input
          name="kmDeclarado"
          type="number"
          min={0}
          required
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">
          O KM informado será conferido pela distância aferida no Google Maps,
          para fins de padronização. Deslocamentos abaixo de {kmMinimo} km sem
          pernoite não fazem jus a benefício algum.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Saída da sede
          </label>
          <input
            name="saidaSede"
            type="datetime-local"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Chegada ao destino
          </label>
          <input
            name="chegadaDestino"
            type="datetime-local"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Saída do destino (retorno)
          </label>
          <input
            name="saidaDestino"
            type="datetime-local"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-slate-500">
            Só configura pernoite se for às 06h ou depois do dia seguinte.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Chegada à sede
          </label>
          <input
            name="chegadaSede"
            type="datetime-local"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Justificativa para lançamento fora do prazo (só obrigatório se o
          prazo mínimo de {prazoMinimoDias} dia(s) de antecedência não for
          respeitado)
        </label>
        <textarea
          name="justificativaPrazoCurto"
          rows={2}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <AtividadesFormSection enquadramentos={enquadramentos} valoresIniciais={rascunho ?? undefined} />

      <label className="flex items-start gap-2 text-xs text-slate-700">
        <input type="checkbox" name="cienciaPrazoAtividade" className="mt-0.5" />
        <span>
          Tenho ciência de que, se a viagem incluir tempo além do
          estritamente necessário para as atividades (chegada adiantada e/ou
          saída atrasada), a diária/hospedagem cobre apenas o período estrito
          da atividade — os dias de folga não são pagos, e o gestor da
          unidade precisará justificar/autorizar essa folga antes do pedido
          seguir no fluxo normal.
        </span>
      </label>

      <div className="space-y-2 rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Tipo de pedido</h2>
        <p className="text-xs text-slate-500">
          Diária e hospedagem são mutuamente exclusivas — a diária já cobre
          alimentação e hospedagem. Cada tipo marcado gera um pedido próprio,
          calculado a partir dos mesmos dados acima.
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="tipoDiaria" defaultChecked />
          Diária
        </label>
        {beneficiarioId && (
          <div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="tipoHospedagem"
                disabled={!elegivelHospedagem}
                checked={querHospedagem}
                onChange={(e) => setQuerHospedagem(e.target.checked)}
              />
              Hospedagem
              {!elegivelHospedagem && (
                <span className="text-xs text-slate-400">
                  (categoria do beneficiário não é elegível para hospedagem)
                </span>
              )}
            </label>
            {querHospedagem && (
              <div className="mt-1 ml-6">
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Contrato de hospedagem
                </label>
                <select
                  name="contratoHospedagemId"
                  required
                  className="w-full max-w-sm rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {contratosHospedagem.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.empresaNome} — contrato {c.numeroContrato}
                    </option>
                  ))}
                </select>
                {contratosHospedagem.length === 0 && (
                  <p className="mt-1 text-xs text-red-600">
                    Não há contrato de hospedagem vigente cadastrado. Peça ao administrador
                    para cadastrar em Contratos.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        <div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="tipoPassagemAerea"
              checked={querPassagemAerea}
              onChange={(e) => setQuerPassagemAerea(e.target.checked)}
            />
            Passagem aérea
            <span className="text-xs text-slate-400">
              (valor preenchido manualmente pelo responsável após cotação externa)
            </span>
          </label>
          {querPassagemAerea && (
            <div className="mt-1 ml-6">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Contrato de passagem aérea
              </label>
              <select
                name="contratoPassagemAereaId"
                required
                className="w-full max-w-sm rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Selecione...</option>
                {contratosPassagemAerea.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.empresaNome} — contrato {c.numeroContrato}
                  </option>
                ))}
              </select>
              {contratosPassagemAerea.length === 0 && (
                <p className="mt-1 text-xs text-red-600">
                  Não há contrato de passagem aérea vigente cadastrado. Peça ao administrador
                  para cadastrar em Contratos.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {state.erro && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Lançar solicitação"}
      </button>
    </form>
  );
}
