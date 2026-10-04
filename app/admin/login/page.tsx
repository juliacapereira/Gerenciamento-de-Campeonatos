"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Trophy,
  CalendarDays,
  Users,
} from "lucide-react";

export default function LoginAdministrador() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function fazerLogin(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (carregando) return;

    setErro("");
    setCarregando(true);

    try {
      const resposta = await fetch(
        "http://localhost:3000/api/admin/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: email.trim(),
            senha,
          }),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro || "Não foi possível realizar o login."
        );
      }

      router.push("/admin");
      router.refresh();

    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro inesperado."
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FAFAF7] text-[#173629]">

      {/* CABEÇALHO */}
      <header className="border-b border-[#E8EAE3] bg-[#FAFAF7]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          {/* LOGOTIPO */}
          <Link
            href="/"
            className="flex items-center gap-3"
          >
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

          {/* VOLTAR */}
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold transition hover:text-[#86A535]"
          >
            <ArrowLeft size={17} />
            Voltar ao início
          </Link>

        </div>
      </header>

      {/* ÁREA PRINCIPAL */}
      <section className="mx-auto grid max-w-7xl items-start gap-12 px-6 py-12 lg:grid-cols-2 lg:gap-20">

        {/* COLUNA ESQUERDA */}
        <div className="relative flex min-h-[570px] flex-col justify-between overflow-hidden rounded-[32px] bg-[#103323] p-10 text-white lg:p-14">

          {/* ELEMENTOS DECORATIVOS */}
          <div className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full border border-[#D5F36A]/20" />

          <div className="pointer-events-none absolute -right-14 -top-14 h-72 w-72 rounded-full border border-[#D5F36A]/10" />

          <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-[#D5F36A]/10 blur-3xl" />

          {/* APRESENTAÇÃO */}
          <div className="relative z-10">

            <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2">

              <span className="h-2 w-2 rounded-full bg-[#D5F36A]" />

              <span className="text-xs font-bold uppercase tracking-widest text-[#D5F36A]">
                Área administrativa
              </span>

            </div>

            <h1 className="mt-12 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Seu campeonato.
              <br />

              Sua organização.
              <br />

              <span className="text-[#D5F36A]">
                Tudo em um só lugar.
              </span>
            </h1>

            <p className="mt-7 max-w-md text-base leading-relaxed text-white/70">
              Organize campeonatos, gerencie equipes e
              acompanhe partidas com facilidade.

              Uma plataforma pensada para transformar
              a gestão do esporte amador.
            </p>

          </div>

          {/* FUNCIONALIDADES */}
          <div className="relative z-10 grid grid-cols-3 gap-4 border-t border-white/15 pt-8">

            <div>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                <Trophy
                  size={21}
                  className="text-[#D5F36A]"
                />
              </div>

              <p className="text-sm font-semibold">
                Campeonatos
              </p>
            </div>

            <div>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                <CalendarDays
                  size={21}
                  className="text-[#D5F36A]"
                />
              </div>

              <p className="text-sm font-semibold">
                Partidas
              </p>
            </div>

            <div>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                <Users
                  size={21}
                  className="text-[#D5F36A]"
                />
              </div>

              <p className="text-sm font-semibold">
                Equipes
              </p>
            </div>

          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div className="mx-auto w-full max-w-md py-8">

          {/* TÍTULO */}
          <div className="mb-9">

            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-[#DDE7CB] bg-[#EDF5D6] px-4 py-2">

              <span className="h-2 w-2 rounded-full bg-[#86A535]" />

              <span className="text-xs font-bold uppercase tracking-widest">
                Acesso administrativo
              </span>

            </div>

            <h2 className="text-4xl font-extrabold tracking-tight">
              Bem-vindo de volta!
            </h2>

            <p className="mt-3 text-base leading-relaxed text-[#718075]">
              Entre com seus dados para acessar
              o painel administrativo.
            </p>

          </div>

          {/* FORMULÁRIO */}
          <form
            onSubmit={fazerLogin}
            className="space-y-6"
          >

            {/* EMAIL */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-bold"
              >
                E-mail
              </label>

              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full rounded-xl border border-[#DDE3DA] bg-white px-5 py-4 text-[#173629] outline-none transition placeholder:text-[#A0AAA0] focus:border-[#86A535] focus:ring-2 focus:ring-[#D5F36A]/30"
              />
            </div>

            {/* SENHA */}
            <div>
              <label
                htmlFor="senha"
                className="mb-2 block text-sm font-bold"
              >
                Senha
              </label>

              <div className="flex overflow-hidden rounded-xl border border-[#DDE3DA] bg-white focus-within:border-[#86A535] focus-within:ring-2 focus-within:ring-[#D5F36A]/30">

                <input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full min-w-0 px-5 py-4 text-[#173629] outline-none placeholder:text-[#A0AAA0]"
                />

                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  aria-label={
                    mostrarSenha
                      ? "Ocultar senha"
                      : "Mostrar senha"
                  }
                  className="flex items-center justify-center px-4 text-[#718075] transition hover:text-[#173629]"
                >
                  {mostrarSenha ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>

              </div>
            </div>

            {/* ERRO */}
            {erro && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {erro}
              </div>
            )}

            {/* BOTÃO ENTRAR */}
            <button
              type="submit"
              disabled={!email.trim() || !senha || carregando}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#D5F36A] px-6 py-4 text-base font-extrabold text-[#173629] transition hover:bg-[#C6E75B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {carregando
                ? "Entrando..."
                : "Entrar no painel"}

              {!carregando && (
                <ArrowRight size={20} />
              )}
            </button>

          </form>

          {/* CADASTRO */}
          <div className="mt-9 border-t border-[#E8EAE3] pt-7 text-center">

            <p className="text-sm text-[#718075]">
              Ainda não possui uma conta?{" "}

              <Link
                href="/admin/cadastro"
                className="font-bold text-[#173629] underline decoration-[#86A535] underline-offset-4 hover:text-[#86A535]"
              >
                Criar conta
              </Link>
            </p>

          </div>

          {/* RODAPÉ */}
          <p className="mt-12 text-center text-xs text-[#A0AAA0]">
            ArenaLocal · Gestão de campeonatos amadores
          </p>

        </div>

      </section>
    </main>
  );
}