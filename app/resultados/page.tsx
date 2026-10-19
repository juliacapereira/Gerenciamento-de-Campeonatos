"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/auth/admin-guard";

// US16 - Registro do placar final
// US17 - Cadastro de gols ou pontos

type Campeonato = { id_campeonato: number; nome: string; esporte: string | null };

type PartidaLista = {
  id_partida: number;
  time_a: string;
  time_b: string;
  data_hora: string;
  status: string;
};

type Pontuacao = {
  id_pontuacao: number;
  id_time: number;
  time: string;
  quantidade: number;
  minuto: number | null;
};

type Placar = {
  partida: {
    id_partida: number;
    id_time_a: number;
    id_time_b: number;
    time_a: string;
    time_b: string;
    data_hora: string;
    local: string | null;
    status: string;
  };
  resultado: { placar_time_a: number; placar_time_b: number } | null;
  placar_acumulado: { time_a: number; time_b: number };
  pontuacoes: Pontuacao[];
};

type Aviso = { tipo: "ok" | "erro"; texto: string } | null;

const NOMES_STATUS: Record<string, string> = {
  AGENDADA: "Agendada",
  EM_ANDAMENTO: "Em andamento",
  ENCERRADA: "Encerrada",
  ADIADA: "Adiada",
  CANCELADA: "Cancelada",
};

// Chama a API (pelo proxy do Next) enviando o cookie da sessão
async function api<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch("/api" + caminho, {
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

function dataHora(valor: string) {
  return new Date(valor).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const campo =
  "w-full rounded-xl border border-[#D9DFD3] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#173629] focus:ring-2 focus:ring-[#D5F36A]";
const botao =
  "rounded-xl bg-[#173629] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#28523C] disabled:cursor-not-allowed disabled:opacity-50";

export default function ResultadosPage() {
  return (
    <AdminGuard>
      <Resultados />
    </AdminGuard>
  );
}

function Resultados() {
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [idCampeonato, setIdCampeonato] = useState("");
  const [partidas, setPartidas] = useState<PartidaLista[]>([]);
  const [idPartida, setIdPartida] = useState("");
  const [placar, setPlacar] = useState<Placar | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [enviando, setEnviando] = useState(false);

  // formulário de gol/ponto (US17)
  const [idTimeGol, setIdTimeGol] = useState("");
  const [minuto, setMinuto] = useState("");
  const [quantidade, setQuantidade] = useState("1");

  // formulário do placar final (US16)
  const [finalA, setFinalA] = useState("");
  const [finalB, setFinalB] = useState("");

  // ---------- carregamento ----------

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

  async function carregarPlacar(id: string) {
    if (!id) return setPlacar(null);
    try {
      const dados = await api<Placar>(`/partidas/${id}/placar`);
      setPlacar(dados);
      // Preenche o placar final com o resultado salvo ou, se não houver, com o acumulado
      setFinalA(String(dados.resultado?.placar_time_a ?? dados.placar_acumulado.time_a));
      setFinalB(String(dados.resultado?.placar_time_b ?? dados.placar_acumulado.time_b));
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    }
  }

  useEffect(() => {
    setAviso(null);
    setIdTimeGol("");
    setMinuto("");
    setQuantidade("1");
    carregarPlacar(idPartida);
  }, [idPartida]);

  // Atualiza o status na lista de partidas depois de uma alteração
  async function recarregarTudo() {
    await carregarPlacar(idPartida);
    if (idCampeonato) {
      api<PartidaLista[]>(`/campeonatos/${idCampeonato}/partidas`).then(setPartidas).catch(() => {});
    }
  }

  // ---------- US17: registrar gol/ponto ----------

  async function registrarGol(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setAviso(null);

    if (!idTimeGol || minuto === "") {
      return setAviso({ tipo: "erro", texto: "Selecione o time e informe o minuto." });
    }

    setEnviando(true);
    try {
      const resposta = await api<{ mensagem: string }>(`/partidas/${idPartida}/pontuacoes`, {
        method: "POST",
        body: JSON.stringify({
          id_time: Number(idTimeGol),
          minuto: Number(minuto),
          quantidade: Number(quantidade || 1),
        }),
      });
      setMinuto("");
      setQuantidade("1");
      await recarregarTudo();
      setAviso({ tipo: "ok", texto: resposta.mensagem });
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setEnviando(false);
    }
  }

  async function removerGol(item: Pontuacao) {
    if (!confirm(`Remover o registro de ${item.time} aos ${item.minuto}'?`)) return;
    setAviso(null);
    try {
      const resposta = await api<{ mensagem: string }>(
        `/partidas/${idPartida}/pontuacoes/${item.id_pontuacao}`,
        { method: "DELETE" }
      );
      await recarregarTudo();
      setAviso({ tipo: "ok", texto: resposta.mensagem });
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    }
  }

  // ---------- US16: registrar placar final ----------

  async function registrarFinal(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setAviso(null);

    if (finalA === "" || finalB === "") {
      return setAviso({ tipo: "erro", texto: "Informe o placar dos dois times." });
    }

    if (!placar?.resultado && !confirm("Registrar o placar final vai encerrar a partida. Continuar?")) return;

    setEnviando(true);
    try {
      const resposta = await api<{ mensagem: string }>(`/partidas/${idPartida}/resultado`, {
        method: "PUT",
        body: JSON.stringify({ placar_time_a: Number(finalA), placar_time_b: Number(finalB) }),
      });
      await recarregarTudo();
      setAviso({ tipo: "ok", texto: resposta.mensagem });
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setEnviando(false);
    }
  }

  // ---------- tela ----------

  const partida = placar?.partida;
  const encerrada = partida?.status === "ENCERRADA";
  const bloqueada = partida?.status === "CANCELADA" || partida?.status === "ADIADA";

  return (
    <main className="min-h-screen bg-[#FAFAF7] text-[#173629]">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link href="/admin" className="text-sm font-semibold text-[#86A535] hover:underline">
          ← Voltar ao painel
        </Link>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Resultados das partidas</h1>
        <p className="mt-1 text-sm text-[#718075]">
          Cadastre os gols ou pontos durante o jogo e registre o placar final ao término.
        </p>

        {/* SELEÇÃO */}
        <section className="mt-8 grid gap-4 rounded-2xl border border-[#E5E9E0] bg-white p-5 sm:grid-cols-2">
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

        {partida && placar && (
          <>
            {/* PLACAR */}
            <section className="mt-6 rounded-2xl bg-[#103323] p-6 text-white">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-[#D5F36A]">
                <span>{NOMES_STATUS[partida.status] ?? partida.status}</span>
                <span className="text-white/60">
                  {dataHora(partida.data_hora)}
                  {partida.local ? ` · ${partida.local}` : ""}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
                <span className="text-lg font-bold">{partida.time_a}</span>
                <span className="text-5xl font-black tabular-nums">
                  {placar.resultado?.placar_time_a ?? placar.placar_acumulado.time_a}
                  <span className="mx-3 text-white/40">x</span>
                  {placar.resultado?.placar_time_b ?? placar.placar_acumulado.time_b}
                </span>
                <span className="text-lg font-bold">{partida.time_b}</span>
              </div>

              <p className="mt-4 text-center text-xs text-white/60">
                {placar.resultado ? "Placar final registrado" : "Placar acumulado pelos gols/pontos cadastrados"}
              </p>
            </section>

            <div className="mt-6 grid items-start gap-6 md:grid-cols-2">
              {/* US17 */}
              <section className="rounded-2xl border border-[#E5E9E0] bg-white p-5">
                <h2 className="text-lg font-extrabold">Gols ou pontos</h2>

                {encerrada || bloqueada ? (
                  <p className="mt-2 text-sm text-[#718075]">
                    {encerrada
                      ? "A partida está encerrada. Não é possível cadastrar novos registros."
                      : "A partida está cancelada ou adiada."}
                  </p>
                ) : (
                  <form onSubmit={registrarGol} className="mt-4 space-y-3">
                    <div>
                      <label htmlFor="time-gol" className="mb-1 block text-sm font-bold">
                        Time que marcou
                      </label>
                      <select
                        id="time-gol"
                        className={campo}
                        value={idTimeGol}
                        onChange={(e) => setIdTimeGol(e.target.value)}
                      >
                        <option value="">Selecione</option>
                        <option value={partida.id_time_a}>{partida.time_a}</option>
                        <option value={partida.id_time_b}>{partida.time_b}</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
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
                          placeholder="35"
                        />
                      </div>
                      <div>
                        <label htmlFor="quantidade" className="mb-1 block text-sm font-bold">
                          Quantidade
                        </label>
                        <input
                          id="quantidade"
                          type="number"
                          min={1}
                          max={100}
                          className={campo}
                          value={quantidade}
                          onChange={(e) => setQuantidade(e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-[#718075]">
                      Use quantidade maior que 1 em esportes como basquete (ex.: cesta de 3 pontos).
                    </p>

                    <button type="submit" className={botao} disabled={enviando}>
                      {enviando ? "Salvando..." : "Registrar"}
                    </button>
                  </form>
                )}

                <h3 className="mt-6 text-sm font-bold">Histórico</h3>
                {placar.pontuacoes.length === 0 ? (
                  <p className="mt-2 text-sm text-[#718075]">Nenhum gol ou ponto cadastrado.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-[#E8EAE3]">
                    {placar.pontuacoes.map((p) => (
                      <li key={p.id_pontuacao} className="flex items-center gap-3 py-2.5 text-sm">
                        <span className="w-10 font-bold tabular-nums text-[#86A535]">
                          {p.minuto !== null ? `${p.minuto}'` : "–"}
                        </span>
                        <span className="flex-1">
                          {p.time}
                          {p.quantidade > 1 && <span className="text-[#718075]"> (+{p.quantidade})</span>}
                        </span>
                        {!encerrada && (
                          <button
                            type="button"
                            onClick={() => removerGol(p)}
                            className="text-xs font-semibold text-red-600 hover:underline"
                          >
                            Remover
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* US16 */}
              <section className="rounded-2xl border border-[#E5E9E0] bg-white p-5">
                <h2 className="text-lg font-extrabold">Placar final</h2>
                <p className="mt-1 text-sm text-[#718075]">
                  {encerrada
                    ? "Partida encerrada. Você pode corrigir o placar, se necessário."
                    : "Ao registrar, a partida é encerrada automaticamente."}
                </p>

                {bloqueada ? (
                  <p className="mt-4 text-sm text-[#718075]">A partida está cancelada ou adiada.</p>
                ) : (
                  <form onSubmit={registrarFinal} className="mt-4 space-y-3">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                      <div>
                        <label htmlFor="final-a" className="mb-1 block truncate text-sm font-bold">
                          {partida.time_a}
                        </label>
                        <input
                          id="final-a"
                          type="number"
                          min={0}
                          className={campo + " text-center text-lg font-bold"}
                          value={finalA}
                          onChange={(e) => setFinalA(e.target.value)}
                        />
                      </div>
                      <span className="pb-3 font-bold text-[#A0AAA0]">x</span>
                      <div>
                        <label htmlFor="final-b" className="mb-1 block truncate text-sm font-bold">
                          {partida.time_b}
                        </label>
                        <input
                          id="final-b"
                          type="number"
                          min={0}
                          className={campo + " text-center text-lg font-bold"}
                          value={finalB}
                          onChange={(e) => setFinalB(e.target.value)}
                        />
                      </div>
                    </div>

                    <button type="submit" className={botao} disabled={enviando}>
                      {enviando ? "Salvando..." : encerrada ? "Corrigir placar" : "Registrar e encerrar"}
                    </button>
                  </form>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
