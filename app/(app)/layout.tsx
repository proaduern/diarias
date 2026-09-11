import Link from "next/link";
import { obterSessao } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await obterSessao();
  if (!sessao) {
    redirect("/login");
  }

  const linksBase = [
    { href: "/", label: "Início" },
    { href: "/pedidos", label: "Pedidos" },
    { href: "/beneficiarios", label: "Beneficiários" },
  ];

  const linksAdmin = [
    { href: "/admin/unidades", label: "Unidades" },
    { href: "/admin/usuarios", label: "Usuários" },
    { href: "/admin/categorias", label: "Categorias" },
    { href: "/admin/tipos-destino", label: "Tipos de destino" },
    { href: "/admin/valores", label: "Valores de diária" },
    { href: "/admin/configuracoes", label: "Configurações" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-semibold text-slate-900">
              Diárias FUERN
            </span>
            <nav className="flex flex-wrap gap-3 text-sm text-slate-600">
              {linksBase.map((l) => (
                <Link key={l.href} href={l.href} className="hover:text-slate-900">
                  {l.label}
                </Link>
              ))}
              {sessao.perfil === "ADMIN" &&
                linksAdmin.map((l) => (
                  <Link key={l.href} href={l.href} className="hover:text-slate-900">
                    {l.label}
                  </Link>
                ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>
              {sessao.nome} ·{" "}
              {sessao.perfil === "ADMIN" ? "Administrador" : "Demandante"}
            </span>
            <form action={logoutAction}>
              <button className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
