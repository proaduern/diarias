import { obterSessao } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

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

  const links = sessao.perfil === "ADMIN" ? [...linksBase, ...linksAdmin] : linksBase;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar nome={sessao.nome} perfil={sessao.perfil} />
      <div className="flex">
        <Sidebar links={links} perfil={sessao.perfil} />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
