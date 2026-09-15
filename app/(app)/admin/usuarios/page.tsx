import { prisma } from "@/lib/prisma";
import { criarUsuarioAction, excluirUsuarioAction } from "@/lib/actions/admin";
import { importarUsuariosAction } from "@/lib/actions/importacao";
import { formatarCpf } from "@/lib/formato";
import FormularioSimples from "../FormularioSimples";
import BotaoExcluir from "../BotaoExcluir";
import ImportarPlanilhaForm from "../ImportarPlanilhaForm";
import PermissoesUsuario from "./PermissoesUsuario";

export default async function UsuariosPage() {
  const [usuarios, unidades] = await Promise.all([
    prisma.usuario.findMany({ include: { unidade: true }, orderBy: { nome: "asc" } }),
    prisma.unidade.findMany({ orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Usuários</h1>
      <p className="text-sm text-slate-500">
        O email de acesso ao sistema precisa ser do domínio @uern.br.
      </p>

      <FormularioSimples
        action={criarUsuarioAction}
        titulo="Novo usuário"
        campos={[
          { name: "nome", label: "Nome", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "cpf", label: "CPF", required: true },
          { name: "senha", label: "Senha provisória", type: "password", required: true },
          {
            name: "perfil",
            label: "Perfil",
            required: true,
            options: [
              { value: "DEMANDANTE", label: "Demandante" },
              { value: "ADMIN", label: "Administrador" },
            ],
          },
          {
            name: "unidadeId",
            label: "Unidade (obrigatório para demandante)",
            options: unidades.map((u) => ({ value: u.id, label: u.nome })),
          },
        ]}
      />

      <ImportarPlanilhaForm
        action={importarUsuariosAction}
        titulo="Importar usuários em lote (planilha)"
        colunas={["nome", "email", "cpf", "senhaInicial", "perfil (ADMIN/DEMANDANTE)", "unidadeNome (para demandante)"]}
        modeloHref="/modelos/usuarios.xlsx"
      />

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">CPF</th>
              <th className="px-4 py-2 font-medium">Perfil</th>
              <th className="px-4 py-2 font-medium">Unidade</th>
              <th className="px-4 py-2 font-medium">Permissões delegadas</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2 text-slate-900">{u.nome}</td>
                <td className="px-4 py-2 text-slate-600">{u.email}</td>
                <td className="px-4 py-2 text-slate-600">{formatarCpf(u.cpf)}</td>
                <td className="px-4 py-2 text-slate-600">{u.perfil}</td>
                <td className="px-4 py-2 text-slate-600">{u.unidade?.nome ?? "-"}</td>
                <td className="px-4 py-2">
                  {u.perfil === "DEMANDANTE" && u.unidadeId ? (
                    <PermissoesUsuario
                      usuarioId={u.id}
                      podeImportarUsuarios={u.podeImportarUsuarios}
                      podeEditarBeneficiarios={u.podeEditarBeneficiarios}
                    />
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <BotaoExcluir action={excluirUsuarioAction} id={u.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
