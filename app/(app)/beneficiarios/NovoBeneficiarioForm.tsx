"use client";

import { useActionState, useState } from "react";
import {
  criarBeneficiarioAction,
  type CriarBeneficiarioState,
} from "@/lib/actions/beneficiarios";
import type { CategoriaBeneficiario, Unidade } from "@prisma/client";

const initialState: CriarBeneficiarioState = {};

export default function NovoBeneficiarioForm({
  categorias,
  unidades,
}: {
  categorias: CategoriaBeneficiario[];
  unidades: Unidade[];
}) {
  const [state, formAction, pending] = useActionState(
    criarBeneficiarioAction,
    initialState,
  );
  const [aberto, setAberto] = useState(false);
  const [semVinculo, setSemVinculo] = useState(false);

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244]"
      >
        Cadastrar beneficiário
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-2xl border border-slate-100 bg-white shadow-sm p-4"
    >
      <h2 className="text-sm font-semibold text-slate-900">Novo beneficiário</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Nome completo
          </label>
          <input
            name="nome"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            CPF
          </label>
          <input
            name="cpf"
            required
            placeholder="000.000.000-00"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Banco
          </label>
          <input
            name="banco"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Agência
          </label>
          <input
            name="agencia"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Conta corrente
          </label>
          <input
            name="contaCorrente"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Categoria
          </label>
          <select
            name="categoriaId"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecione...</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={semVinculo}
              onChange={(e) => setSemVinculo(e.target.checked)}
            />
            Colaborador eventual, sem vínculo funcional com nenhuma unidade
          </label>
          {!semVinculo && (
            <select
              name="unidadeVinculoId"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Selecione a unidade de vínculo...</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          )}
        </div>
        {!semVinculo && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Matrícula
              </label>
              <input
                name="matricula"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Cargo/função
              </label>
              <input
                name="cargo"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Nº da Portaria de FG / CC (se possuir)
              </label>
              <input
                name="portariaFg"
                placeholder="Ex.: Portaria nº 412/2025-GP/FUERN"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Data de nascimento (Formulários Diária/Passagem/eSocial)
          </label>
          <input
            name="dataNascimento"
            placeholder="dd/mm/aaaa"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            R.G. / Órgão Expedidor (Formulário de Passagens Aéreas)
          </label>
          <input
            name="rg"
            placeholder="Ex.: 1.234.567 ITEP/RN"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Passaporte (Caso possua / Viagem Internacional)
          </label>
          <input
            name="passaporte"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Telefone / WhatsApp para contato
          </label>
          <input
            name="telefone"
            placeholder="(84) 99999-0000"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            E-mail para contato
          </label>
          <input
            name="email"
            type="email"
            placeholder="beneficiario@uern.br"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Endereço Residencial Completo (Obrigatório p/ Hospedagem POP 06 e Colaborador Externo)
          </label>
          <input
            name="enderecoCompleto"
            placeholder="Rua/Av., Número, Bairro, CEP, Município/UF"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {semVinculo && (
          <div className="sm:col-span-2 space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3.5">
            <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
              Dados Obrigatórios de Cadastro eSocial — Agente Colaborador / Colaborador Eventual (POP 03 e POP 04)
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  NIS ou PIS/PASEP
                </label>
                <input
                  name="nisPisPasep"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm"
                />
              </div>
              <div className="flex items-center pt-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <input type="checkbox" name="servidorOutroOrgao" />
                  Servidor(a) Público(a) de outro órgão?
                </label>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Matrícula no órgão de origem (se servidor)
                </label>
                <input
                  name="matricula"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Estado Civil
                </label>
                <input
                  name="estadoCivil"
                  placeholder="Solteiro(a), Casado(a)..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Sexo
                </label>
                <input
                  name="sexo"
                  placeholder="Masculino / Feminino"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Grau de Instrução
                </label>
                <input
                  name="grauInstrucao"
                  placeholder="Superior, Mestrado, Doutorado..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Raça / Cor
                </label>
                <input
                  name="racaCor"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Município / UF de Domicílio
                </label>
                <input
                  name="municipioUfEndereco"
                  placeholder="Ex.: Fortaleza/CE"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Ocupação / Curso (tutor, instrutor, palestrante...)
                </label>
                <input
                  name="ocupacaoCurso"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {state.erro && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.erro}
        </p>
      )}
      {state.sucesso && (
        <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">
          Beneficiário cadastrado com sucesso.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
