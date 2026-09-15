import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/auth";
import { importarUsuariosAction } from "@/lib/actions/importacao";
import ImportarPlanilhaForm from "../admin/ImportarPlanilhaForm";

export default async function ImportarUsuariosPage() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  if (sessao.perfil === "ADMIN") redirect("/admin/usuarios");
  if (!sessao.podeImportarUsuarios) redirect("/");

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Importar usuários</h1>
      <p className="text-sm text-slate-500">
        Cadastre em lote os usuários demandantes da sua unidade. Todos entram com o perfil
        Demandante, vinculados à sua própria unidade — a planilha não escolhe unidade nem perfil.
      </p>

      <ImportarPlanilhaForm
        action={importarUsuariosAction}
        titulo="Importar usuários em lote (planilha)"
        colunas={["nome", "email", "cpf", "senhaInicial"]}
        modeloHref="/modelos/usuarios-demandante.xlsx"
      />
    </div>
  );
}
