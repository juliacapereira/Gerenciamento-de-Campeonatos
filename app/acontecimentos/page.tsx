"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/auth/admin-guard";

// US21 - Histórico de acontecimentos da partida

type Campeonato = { id_campeonato: number; nome: string; esporte: string | null };

type PartidaLista = {
  id_partida: number;
  time_a: string;
  time_b: string;
  data_hora: string | null;
  status: string;
};

type Atleta = {
  id_jogador: number;
  nome: string;
  numero_camisa: number | null;
};

type Acontecimento = {
  id_acontecimento: number;
  id_time: number | null;
  id_jogador: number | null;
  jogador: string | null;
  tipo: string;
  minuto: number | null;
  descricao: string | null;
};

type Detalhes = {
  partida: {
    id_partida: number;
    id_time_a: number;
    id_time_b: number;
    time_a: string;
    time_b: string;
    status: string;
  };
  acontecimentos: Acontecimento[];
  escalacoes: { time_a: Atleta[]; time_b: Atleta[] };
};

type Aviso = { tipo: "ok" | "erro"; texto: string } | null;

// Mesma lista validada pelo backend (backend/acontecimentos.js)
const TIPOS = [
  "Cartão amarelo",
  "Cartão vermelho",
  "Falta",
  "Pênalti",
  "Lesão",
  "Substituição",
  "Impedimento",
  "Início da partida",
  "Intervalo",
  "Fim da partida",
  "Outro",
];
const EXIGE_JOGADOR = ["Cartão amarelo", "Cartão vermelho", "Falta", "Pênalti", "Lesão"];
const SEM_JOGADOR = ["Início da partida", "Intervalo", "Fim da partida"];

const NOMES_STATUS: Record<string, string> = {
  AGENDADA: "Agendada",
  EM_ANDAMENTO: "Em andamento",
  ENCERRADA: "Encerrada",
  ADIADA: "Adiada",
  CANCELADA: "Cancelada",
};

async function api<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch("/api" + caminho, {
      cache: "no-store",
      ...opcoes,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor.");
  }

  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new Error(dados?.erro ?? "O servidor respondeu com erro.");
  return dados as T;
}

function dataHora(valor: string | null) {
  if (!valor) return "Data não informada";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const campo =
  "w-full rounded-xl border border-[#D9DFD3] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#173629] focus:ring-2 focus:ring-[#D5F36A] disabled:bg-[#F3F4EE] disabled:text-[#8A948A]";
const botao =
  "rounded-xl bg-[#173629] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#28523C] disabled:cursor-not-allowed disabled:opacity-50";

export default function AcontecimentosPage() {
  return (
    <AdminGuard>
      <Acontecimentos />
    </AdminGuard>
  );
}

function Acontecimentos() {
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [idCampeonato, setIdCampeonato] = useState("");
  const [partidas, setPartidas] = useState<PartidaLista[]>([]);
  const [idPartida, setIdPartida] = useState("");
  const [detalhes, setDetalhes] = useState<Detalhes | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [enviando, setEnviando] = useState(false);

  // formulário
  const [tipo, setTipo] = useState(TIPOS[0]);
  const [minuto, setMinuto] = useState("");
  const [idTime, setIdTime] = useState("");
  const [idJogador, setIdJogador] = useState("");
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    api<Campeonato[]>("/campeonatos")
      .then(setCampeonatos)
      .catch((e) => setAviso({ tipo: "erro", texto: e.message }));
  }, []);

  useEffect(() => {
    setPartidas([]);
    setIdPartida("");
    if (!idCampeonato) return;

    api<PartidaLista[]>(`/campeonatos/${idCampeonato}/partidas`)
      .then(setPartidas)
      .catch((e) => setAviso({ tipo: "erro", texto: e.message }));
  }, [idCampeonato]);

  async function carregar(id: string) {
    try {
      setDetalhes(await api<Detalhes>(`/partidas/${id}`));
    } catch (e) {
      setDetalhes(null);
      setAviso({ tipo: "erro", texto: e instanceof Error ? e.message : "Erro ao carregar a partida." });
    }
  }

  useEffect(() => {
    setDetalhes(null);
    setAviso(null);
    setIdTime("");
    setIdJogador("");
    if (idPartida) void carregar(idPartida);
  }, [idPartida]);

  const semJogador = SEM_JOGADOR.includes(tipo);
  const exigeJogador = EXIGE_JOGADOR.includes(tipo);

  const atletas = !detalhes
    ? []
    : idTime === String(detalhes.partida.id_time_a)
      ? detalhes.escalacoes.time_a
      : idTime === String(detalhes.partida.id_time_b)
        ? detalhes.escalacoes.time_b
        : [];

  const bloqueada =
    detalhes?.partida.status === "CANCELADA" || detalhes?.partida.status === "ADIADA";

  async function registrar(e: FormEvent) {
    e.preventDefault();
    if (!detalhes) return;
    setAviso(null);

    if (minuto.trim() === "") {
      setAviso({ tipo: "erro", texto: "Informe o minuto do acontecimento." });
      return;
    }
    if (exigeJogador && !idJogador) {
      setAviso({ tipo: "erro", texto: `Selecione o jogador envolvido em "${tipo}".` });
      return;
    }

    setEnviando(true);
    try {
      const resposta = await api<{ mensagem: string }>(
        `/partidas/${detalhes.partida.id_partida}/acontecimentos`,
        {
          method: "POST",
          body: JSON.stringify({
            tipo,
            minuto: Number(minuto),
            id_time: semJogador || !idTime ? null : Number(idTime),
            id_jogador: semJogador || !idJogador ? null : Number(idJogador),
            descricao,
          }),
        }
      );
      setAviso({ tipo: "ok", texto: resposta.mensagem });
      setMinuto("");
      setDescricao("");
      setIdJogador("");
      await carregar(String(detalhes.partida.id_partida));
    } catch (erro) {
      setAviso({ tipo: "erro", texto: erro instanceof Error ? erro.message : "Erro ao registrar." });
    } finally {
      setEnviando(false);
    }
  }

  async function remover(item: Acontecimento) {
    if (!detalhes) return;
    if (!confirm(`Remover "${item.tipo}" do minuto ${item.minuto ?? "?"}?`)) return;

    try {
      await api(`/partidas/${detalhes.partida.id_partida}/acontecimentos/${item.id_acontecimento}`, {
        method: "DELETE",
      });
      setAviso({ tipo: "ok", texto: "Acontecimento removido." });
      await carregar(String(detalhes.partida.id_partida));
    } catch (erro) {
      setAviso({ tipo: "erro", texto: erro instanceof Error ? erro.message : "Erro ao remover." });
    }
  }

  const nomeDoTime = (id: number | null) =>
    !detalhes || id === null
      ? null
      : id === detalhes.partida.id_time_a
        ? detalhes.partida.time_a
        : id === detalhes.partida.id_time_b
          ? detalhes.partida.time_b
          : null;

  return (
    <main className="min-h-screen bg-[#FBFBF8] px-4 py-10 text-[#173629]">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="text-sm font-semibold text-[#526d32] hover:underline">
          ← Voltar ao painel
        </Link>

        <h1 className="mt-4 font-display text-3xl font-extrabold">Acontecimentos da partida</h1>
        <p className="mt-2 text-sm text-[#5E6F5E]">
          Registre cartões, faltas e outros lances importantes. Eles aparecem na linha do tempo da
          página da partida.
        </p>

        <section className="mt-8 grid gap-4 rounded-2xl border border-[#E8EAE3] bg-white p-6 sm:grid-cols-2">
          <div>
            <label htmlFor="campeonato" className="mb-1 block text-sm font-bold">
              Campeonato
            </label>
            <select
              id="campeonato"
              className={campo}
              value={idCampeonato}
              onChange={(e) => setIdCampeonato(e.target.value)}
            >
              <option value="">Selecione</option>
              {campeonatos.map((c) => (
                <option key={c.id_campeonato} value={c.id_campeonato}>
                  {c.nome}
                  {c.esporte ? ` (${c.esporte})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="partida" className="mb-1 block text-sm font-bold">
              Partida
            </label>
            <select
              id="partida"
              className={campo}
              value={idPartida}
              onChange={(e) => setIdPartida(e.target.value)}
              disabled={!idCampeonato}
            >
              <option value="">
                {!idCampeonato
                  ? "Escolha um campeonato"
                  : partidas.length
                    ? "Selecione"
                    : "Nenhuma partida cadastrada"}
              </option>
              {partidas.map((p) => (
                <option key={p.id_partida} value={p.id_partida}>
                  {p.time_a} x {p.time_b} · {dataHora(p.data_hora)} · {NOMES_STATUS[p.status] ?? p.status}
                </option>
              ))}
            </select>
          </div>
        </section>

        {aviso && (
          <p
            role={aviso.tipo === "erro" ? "alert" : "status"}
            className={
              "mt-6 rounded-xl border p-4 text-sm " +
              (aviso.tipo === "erro"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-[#CBD7BE] bg-[#EDF5D6] text-[#173629]")
            }
          >
            {aviso.texto}
          </p>
        )}

        {detalhes && (
          <>
            <section className="mt-6 rounded-2xl bg-[#103323] p-6 text-white">
              <p className="text-xs font-bold uppercase tracking-widest text-[#D5F36A]">
                {NOMES_STATUS[detalhes.partida.status] ?? detalhes.partida.status}
              </p>
              <p className="mt-2 font-display text-xl font-bold">
                {detalhes.partida.time_a} x {detalhes.partida.time_b}
              </p>
              <Link
                href={`/partidas/${detalhes.partida.id_partida}`}
                className="mt-3 inline-block text-sm font-semibold text-[#D5F36A] hover:underline"
              >
                Ver página da partida →
              </Link>
            </section>

            <form
              onSubmit={registrar}
              className="mt-6 grid gap-4 rounded-2xl border border-[#E8EAE3] bg-white p-6 sm:grid-cols-2"
            >
              <h2 className="font-display text-lg font-bold sm:col-span-2">Novo acontecimento</h2>

              {bloqueada && (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 sm:col-span-2">
                  Esta partida está cancelada ou adiada. Não é possível registrar acontecimentos.
                </p>
              )}

              <div>
                <label htmlFor="tipo" className="mb-1 block text-sm font-bold">
                  Tipo
                </label>
                <select
                  id="tipo"
                  className={campo}
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  disabled={bloqueada}
                >
                  {TIPOS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="minuto" className="mb-1 block text-sm font-bold">
                  Minuto
                </label>
                <input
                  id="minuto"
                  type="number"
                  min={0}
                  max={300}
                  className={campo}
                  value={minuto}
                  onChange={(e) => setMinuto(e.target.value)}
                  disabled={bloqueada}
                  placeholder="Ex.: 23"
                />
              </div>

              <div>
                <label htmlFor="time" className="mb-1 block text-sm font-bold">
                  Time {exigeJogador ? "" : "(opcional)"}
                </label>
                <select
                  id="time"
                  className={campo}
                  value={idTime}
                  onChange={(e) => {
                    setIdTime(e.target.value);
                    setIdJogador("");
                  }}
                  disabled={bloqueada || semJogador}
                >
                  <option value="">{semJogador ? "Não se aplica" : "Selecione"}</option>
                  <option value={detalhes.partida.id_time_a}>{detalhes.partida.time_a}</option>
                  <option value={detalhes.partida.id_time_b}>{detalhes.partida.time_b}</option>
                </select>
              </div>

              <div>
                <label htmlFor="jogador" className="mb-1 block text-sm font-bold">
                  Jogador envolvido {exigeJogador ? "" : "(opcional)"}
                </label>
                <select
                  id="jogador"
                  className={campo}
                  value={idJogador}
                  onChange={(e) => setIdJogador(e.target.value)}
                  disabled={bloqueada || semJogador || !idTime}
                >
                  <option value="">
                    {semJogador
                      ? "Não se aplica"
                      : !idTime
                        ? "Escolha o time primeiro"
                        : atletas.length
                          ? "Selecione"
                          : "Time sem jogadores no elenco"}
                  </option>
                  {atletas.map((a) => (
                    <option key={a.id_jogador} value={a.id_jogador}>
                      {a.numero_camisa !== null ? `${a.numero_camisa} · ` : ""}
                      {a.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="descricao" className="mb-1 block text-sm font-bold">
                  Descrição {tipo === "Outro" ? "" : "(opcional)"}
                </label>
                <textarea
                  id="descricao"
                  rows={3}
                  maxLength={500}
                  className={campo}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  disabled={bloqueada}
                />
              </div>

              <div className="sm:col-span-2">
                <button type="submit" className={botao} disabled={enviando || bloqueada}>
                  {enviando ? "Registrando..." : "Registrar acontecimento"}
                </button>
              </div>
            </form>

            <section className="mt-6 rounded-2xl border border-[#E8EAE3] bg-white p-6">
              <h2 className="font-display text-lg font-bold">Registrados nesta partida</h2>

              {detalhes.acontecimentos.length === 0 ? (
                <p className="mt-4 text-sm text-[#5E6F5E]">Nenhum acontecimento registrado ainda.</p>
              ) : (
                <ul className="mt-4 divide-y divide-[#E8EAE3]">
                  {detalhes.acontecimentos.map((item) => (
                    <li key={item.id_acontecimento} className="flex items-start justify-between gap-4 py-3">
                      <div className="min-w-0 text-sm">
                        <p className="font-semibold">
                          {item.minuto !== null ? `${item.minuto}' · ` : ""}
                          {item.tipo}
                        </p>
                        <p className="mt-1 text-[#5E6F5E]">
                          {[item.jogador, nomeDoTime(item.id_time)].filter(Boolean).join(" · ") ||
                            "Sem jogador ou time"}
                        </p>
                        {item.descricao && <p className="mt-1 text-[#5E6F5E]">{item.descricao}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => remover(item)}
                        className="shrink-0 text-sm font-bold text-red-700 hover:underline"
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}