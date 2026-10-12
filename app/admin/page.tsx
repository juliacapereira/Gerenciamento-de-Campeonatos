
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  LogOut,
  Trophy,
  Users,
  UserRound,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";

type Usuario = {
  id: string;
  nome: string;
  email: string;
};

  const funcionalidades = [
  {
    titulo: "Campeonatos",
    descricao: "Crie e organize suas competições.",
    icone: Trophy,
    href: "/campeonatos",
  },
  {
    titulo: "Equipes",
    descricao: "Gerencie os times participantes.",
    icone: Users,
    href: "/times",
  },
  {
    titulo: "Partidas",
    descricao: "Organize jogos e resultados.",
    icone: CalendarDays,
    href: null,
  },
  {
    titulo: "Jogadores",
    descricao: "Consulte e gerencie os atletas cadastrados.",
    icone: UserRound,
    href: "/jogadores",
  },
];


export default function PainelAdministrador() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo] = useState(false);
  const [erroSaida, setErroSaida] = useState("");

  useEffect(() => {
    let ativo = true;

    async function verificarSessao() {
      try {
        const resposta = await fetch(
          "/api/admin/me",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!resposta.ok) {
          router.replace("/admin/login");
          return;
        }

        const dados = await resposta.json();

        if (ativo) {
          setUsuario(dados.usuario);
        }
      } catch {
        router.replace("/admin/login");
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    verificarSessao();

    return () => {
      ativo = false;
    };
  }, [router]);

  async function sair() {
    if (saindo) return;

    setSaindo(true);
    setErroSaida("");

    try {
      const resposta = await fetch(
        "/api/admin/logout",
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!resposta.ok) {
        throw new Error("Não foi possível encerrar a sessão.");
      }

      router.replace("/admin/login");
      router.refresh();
    } catch {
      setErroSaida(
        "Não foi possível sair da conta. Tente novamente."
      );
      setSaindo(false);
    }
  }

  if (carregando || !usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAFAF7]">
        <div className="flex items-center gap-3 text-[#173629]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#D5F36A] border-t-[#173629]" />
          <span className="font-semibold">
            Verificando sua sessão...
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF7] text-[#173629]">

      {/* CABEÇALHO */}
      <header className="border-b border-[#E8EAE3] bg-[#FAFAF7]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">

          {/* MARCA */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#173629]">
              <span className="text-xl font-black text-[#D5F36A]">
                A
              </span>
            </div>

            <span className="text-xl font-extrabold tracking-tight">
              arena
              <span className="text-[#86A535]">
                local
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-[#718075] sm:block">
              {usuario.nome}
            </span>

            <button
              type="button"
              onClick={sair}
              disabled={saindo}
              className="flex items-center gap-2 rounded-xl bg-[#173629] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#28523C] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut size={17} />
              {saindo ? "Saindo..." : "Sair"}
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* IDENTIFICAÇÃO */}
        <div className="mb-7 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#86A535]">
          <LayoutDashboard size={16} />
          Área administrativa
        </div>

        {/* BOAS-VINDAS */}
        <section className="relative overflow-hidden rounded-[32px] bg-[#103323] p-8 text-white sm:p-12">

          {/* DETALHES VISUAIS */}
          <div className="pointer-events-none absolute -right-28 -top-40 h-96 w-96 rounded-full border border-[#D5F36A]/20" />
          <div className="pointer-events-none absolute -right-10 -top-20 h-72 w-72 rounded-full border border-[#D5F36A]/10" />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#D5F36A]">
              <span className="h-2 w-2 rounded-full bg-[#D5F36A]" />
              Painel administrativo
            </span>

            <h1 className="mt-7 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Bem-vindo(a),{" "}
              <span className="text-[#D5F36A]">
                {usuario.nome}!
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70">
              Aqui você poderá organizar campeonatos,
              administrar equipes e acompanhar as partidas
              em um só lugar.
            </p>

            <div className="mt-8 inline-flex max-w-full items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/80">
              <ShieldCheck
                size={18}
                className="shrink-0 text-[#D5F36A]"
              />

              <span className="break-all">
                Sessão ativa: {usuario.email}
              </span>
            </div>
          </div>
        </section>

        {/* FUNCIONALIDADES */}
        <section className="mt-12">

          <div className="mb-7">
            <h2 className="text-2xl font-extrabold tracking-tight">
              Gerenciamento
            </h2>

            <p className="mt-2 text-sm text-[#718075]">
              As principais áreas administrativas do ArenaLocal.
            </p>
          </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
  {funcionalidades.map((item) => {
    const Icone = item.icone;

    const conteudo = (
      <>
        <div>
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EDF5D6]">
            <Icone
              size={23}
              className="text-[#173629]"
            />
          </div>

          <h3 className="text-lg font-extrabold">
            {item.titulo}
          </h3>

          <p className="mt-2 text-sm leading-relaxed text-[#718075]">
            {item.descricao}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-[#E8EAE3] pt-4">
          <span className="text-xs font-bold uppercase tracking-wide text-[#86A535]">
            {item.href ? "Acessar" : "Em breve"}
          </span>

          <ArrowRight
            size={18}
            className="text-[#A0AAA0]"
          />
        </div>
      </>
    );

    if (item.href) {
      return (
        <Link
          key={item.titulo}
          href={item.href}
          className="flex min-h-[215px] flex-col justify-between rounded-2xl border border-[#E5E9E0] bg-white p-6 transition hover:-translate-y-1 hover:border-[#CBD7BE] hover:shadow-lg"
        >
          {conteudo}
        </Link>
      );
    }

    return (
      <div
        key={item.titulo}
        className="flex min-h-[215px] flex-col justify-between rounded-2xl border border-[#E5E9E0] bg-white p-6 opacity-70"
      >
        {conteudo}
      </div>
    );
  })}
</div>

        </section>

        {/* MENSAGEM DE ERRO DO LOGOUT */}
        {erroSaida && (
          <p
            role="alert"
            className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {erroSaida}
          </p>
        )}

        {/* RODAPÉ */}
        <footer className="mt-14 border-t border-[#E8EAE3] py-7 text-center text-xs text-[#A0AAA0]">
          ArenaLocal · Gestão de campeonatos amadores
        </footer>

      </div>
    </main>
  );
}
