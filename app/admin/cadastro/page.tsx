
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

export default function CadastroAdministrador() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const emailValido =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const senhaValida =
    senha.length >= 8 &&
    /[A-Z]/.test(senha) &&
    /[a-z]/.test(senha) &&
    /[0-9]/.test(senha) &&
    new TextEncoder().encode(senha).length <= 72;

  const formularioValido =
    nome.trim().length >= 2 &&
    nome.trim().length <= 120 &&
    email.trim().length <= 180 &&
    emailValido &&
    senhaValida &&
    senha === confirmarSenha;

  const estiloCampo =
    "w-full rounded-xl border border-[#DDE3DA] " +
    "bg-white px-5 py-3.5 text-[#173629] " +
    "outline-none transition " +
    "placeholder:text-[#A0AAA0] " +
    "focus:border-[#86A535] " +
    "focus:ring-2 focus:ring-[#D5F36A]/30";

  async function cadastrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!formularioValido || carregando || sucesso) return;

    setErro("");
    setSucesso("");
    setCarregando(true);

    try {
      const resposta = await fetch("/api/admin/cadastro", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha,
      }),
    });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro || "Não foi possível realizar o cadastro."
        );
      }

      setSucesso("Conta criada com sucesso! Redirecionando...");

      setTimeout(() => {
        router.push("/admin/login");
      }, 1500);

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

      {/* CABEÇALHO - MESMO PADRÃO DO LOGIN */}
      <header className="border-b border-[#E8EAE3] bg-[#FAFAF7]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#173629]">
              <span className="text-xl font-black text-[#D5F36A]">
                A
              </span>
            </div>

            <span className="text-xl font-extrabold tracking-tight">
              arena<span className="text-[#86A535]">local</span>
            </span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold transition hover:text-[#86A535]"
          >
            <ArrowLeft size={17} />
            Voltar ao início
          </Link>
        </div>
      </header>

      {/* DUAS COLUNAS */}
      <section className="mx-auto grid max-w-7xl items-start gap-12 px-6 py-12 lg:grid-cols-2 lg:gap-20">

        {/* PAINEL VERDE - IGUAL AO LOGIN */}
        <div className="relative flex min-h-[570px] flex-col justify-between overflow-hidden rounded-[32px] bg-[#103323] p-10 text-white lg:p-14">

          <div className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full border border-[#D5F36A]/20" />
          <div className="pointer-events-none absolute -right-14 -top-14 h-72 w-72 rounded-full border border-[#D5F36A]/10" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-[#D5F36A]/10 blur-3xl" />

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
              Organize campeonatos, gerencie equipes e acompanhe
              partidas com facilidade. Uma plataforma pensada
              para transformar a gestão do esporte amador.
            </p>
          </div>

          {/* ÍCONES PROFISSIONAIS */}
          <div className="relative z-10 grid grid-cols-3 gap-4 border-t border-white/15 pt-8">
            <div>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                <Trophy size={21} className="text-[#D5F36A]" />
              </div>
              <p className="text-sm font-semibold">Campeonatos</p>
            </div>

            <div>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                <CalendarDays size={21} className="text-[#D5F36A]" />
              </div>
              <p className="text-sm font-semibold">Partidas</p>
            </div>

            <div>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                <Users size={21} className="text-[#D5F36A]" />
              </div>
              <p className="text-sm font-semibold">Equipes</p>
            </div>
          </div>
        </div>

        {/* FORMULÁRIO */}
        <div className="mx-auto w-full max-w-md py-5">

          <div className="mb-6">
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-[#DDE7CB] bg-[#EDF5D6] px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-[#86A535]" />
              <span className="text-xs font-bold uppercase tracking-widest">
                Acesso administrativo
              </span>
            </div>

            <h2 className="text-4xl font-extrabold tracking-tight">
              Crie sua conta.
            </h2>

            <p className="mt-3 text-base leading-relaxed text-[#718075]">
              Preencha seus dados para começar a gerenciar
              suas competições.
            </p>
          </div>

          <form onSubmit={cadastrar} className="space-y-4">

            {/* NOME */}
            <div>
              <label
                htmlFor="nome"
                className="mb-2 block text-sm font-bold"
              >
                Nome completo
              </label>

              <input
                id="nome"
                type="text"
                required
                maxLength={120}
                autoComplete="name"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite seu nome completo"
                className={estiloCampo}
              />
            </div>

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
                maxLength={180}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className={estiloCampo}
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
                  autoComplete="new-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Crie uma senha"
                  className="w-full min-w-0 px-5 py-3.5 text-[#173629] outline-none"
                />

                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  aria-label={
                    mostrarSenha ? "Ocultar senha" : "Mostrar senha"
                  }
                  className="px-4 text-[#718075] transition hover:text-[#173629]"
                >
                  {mostrarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-[#718075]">
                Mínimo de 8 caracteres, com letras maiúsculas,
                minúsculas e números.
              </p>
            </div>

            {/* CONFIRMAÇÃO */}
            <div>
              <label
                htmlFor="confirmarSenha"
                className="mb-2 block text-sm font-bold"
              >
                Confirmar senha
              </label>

              <input
                id="confirmarSenha"
                type="password"
                required
                autoComplete="new-password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita sua senha"
                className={estiloCampo}
              />

              {confirmarSenha && confirmarSenha !== senha && (
                <p className="mt-2 text-xs font-medium text-red-600">
                  As senhas não coincidem.
                </p>
              )}
            </div>

            {erro && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {erro}
              </div>
            )}

            {sucesso && (
              <div
                role="status"
                className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"
              >
                {sucesso}
              </div>
            )}

            <button
              type="submit"
              disabled={!formularioValido || carregando || !!sucesso}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#D5F36A] px-6 py-4 font-extrabold text-[#173629] transition hover:bg-[#C6E75B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {carregando ? "Criando conta..." : "Criar minha conta"}
              {!carregando && !sucesso && <ArrowRight size={20} />}
            </button>
          </form>

          {/* RODAPÉ */}
          <div className="mt-6 border-t border-[#E8EAE3] pt-5 text-center">
            <p className="text-sm text-[#718075]">
              Já possui uma conta?{" "}
              <Link
                href="/admin/login"
                className="font-bold text-[#173629] underline decoration-[#86A535] underline-offset-4 hover:text-[#86A535]"
              >
                Fazer login
              </Link>
            </p>
          </div>

          <p className="mt-7 text-center text-xs text-[#A0AAA0]">
            ArenaLocal · Gestão de campeonatos amadores
          </p>
        </div>
      </section>
    </main>
  );
}
