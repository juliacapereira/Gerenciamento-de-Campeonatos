"use client";

// US24 - Correção das estatísticas dos jogadores (qualquer administrador).

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/auth/admin-guard";
import type { Estatisticas, EstatisticaCampeonato, Numeros } from "@/components/arena/estatisticas";

type Jogador = { id_jogador: number; nome: string; posicao: string | null };
type Valores = Record<keyof Numeros, string>;
type Aviso = { tipo: "ok" | "erro"; texto: string } | null;

const CAMPOS: { chave: keyof Numeros; rotulo: string }[] = [
  { chave: "gols", rotulo: "Gols/pontos" },
  { chave: "partidas", rotulo: "Partidas" },
  { chave: "cartoes_amarelos", rotulo: "Cartões amarelos" },
  { chave: "cartoes_vermelhos", rotulo: "Cartões vermelhos" },
];

async function api<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch("/api" + caminho, {
      ...opcoes,
      cache: "no-store",
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

const paraTexto = (n: Numeros): Valores => ({
  gols: String(n.gols),
  partidas: String(n.partidas),
  cartoes_amarelos: String(n.cartoes_amarelos),
  cartoes_vermelhos: String(n.cartoes_vermelhos),
});

const campo =
  "w-full rounded-xl border border-[#D9DFD3] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#173629] focus:ring-2 focus:ring-[#D5F36A]";
const botao =
  "rounded-xl bg-[#173629] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#28523C] disabled:cursor-not-allowed disabled:opacity-50";
const botaoSecundario =
  "rounded-xl border border-[#D9DFD3] bg-white px-4 py-2.5 text-sm font-semibold text-[#173629] transition hover:bg-[#F1F4EA] disabled:cursor-not-allowed disabled:opacity-50";

export default function EstatisticasAdminPage() {
  return (
    <AdminGuard>
      <EstatisticasAdmin />
    </AdminGuard>
  );
}

function EstatisticasAdmin() {
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [idJogador, setIdJogador] = useState("");
  const [dados, setDados] = useState<Estatisticas | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    // Permite abrir direto um jogador: /admin/estatisticas?jogador=5
    setIdJogador(new URLSearchParams(window.location.search).get("jogador") ?? "");

    api<Jogador[]>("/jogadores")
      .then(setJogadores)
      .catch((e) => setErro(e.message));
  }, []);

  async function carregar(id: string) {
    setDados(null);
    setErro("");
    if (!id) return;
    try {
      setDados(await api<Estatisticas>(`/jogadores/${id}/estatisticas`));
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  useEffect(() => {
    carregar(idJogador);
    window.history.replaceState(
      null,
      "",
      idJogador ? `/admin/estatisticas?jogador=${idJogador}` : "/admin/estatisticas"
    );
  }, [idJogador]);

  return (
    <main className="min-h-screen bg-[#FAFAF7] text-[#173629]">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link href="/admin" className="text-sm font-semibold text-[#86A535] hover:underline">
          ← Voltar ao painel
        </Link>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Estatísticas dos jogadores</h1>
        <p className="mt-1 max-w-prose text-sm text-[#718075]">
          Confira os números calculados pelo sistema e corrija o que estiver diferente, como partidas
          jogadas ou cartões. Qualquer administrador pode fazer correções.
        </p>

        {/* ESCOLHA DO JOGADOR */}
        <section className="mt-8 rounded-2xl border border-[#E5E9E0] bg-white p-5">
          <BuscaJogador
            jogadores={jogadores}
            idSelecionado={idJogador}
            nomeSelecionado={
              jogadores.find((j) => String(j.id_jogador) === idJogador)?.nome ?? dados?.jogador.nome ?? ""
            }
            aoEscolher={setIdJogador}
          />
        </section>

        {erro && (
          <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {erro}
          </p>
        )}

        {dados && (
          <>
            <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold">{dados.jogador.nome}</h2>
                <p className="text-sm text-[#718075]">
                  Total: {dados.total.gols} gols/pontos · {dados.total.partidas} partidas ·{" "}
                  {dados.total.cartoes_amarelos} amarelos · {dados.total.cartoes_vermelhos} vermelhos
                </p>
              </div>
              <Link
                href={`/jogadores/${dados.jogador.id_jogador}`}
                className="text-sm font-semibold text-[#86A535] hover:underline"
              >
                Ver perfil público
              </Link>
            </div>

            {dados.campeonatos.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-[#E5E9E0] bg-white p-5 text-sm text-[#718075]">
                Este atleta ainda não aparece em nenhum campeonato. Ele passa a aparecer aqui quando o
                time dele é inscrito em um campeonato ou quando ele marca em uma partida.
              </p>
            ) : (
              <div className="mt-5 grid gap-5">
                {dados.campeonatos.map((c) => (
                  <FormularioCampeonato
                    key={c.id_campeonato}
                    idJogador={dados.jogador.id_jogador}
                    item={c}
                    aoSalvar={() => carregar(idJogador)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

// Ignora maiúsculas e acentos: "joao" encontra "João"
const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Campo único: digita o nome, a lista aparece embaixo e clica no jogador.
// Também funciona pelo teclado: setas, Enter e Esc.
function BuscaJogador({
  jogadores,
  idSelecionado,
  nomeSelecionado,
  aoEscolher,
}: {
  jogadores: Jogador[];
  idSelecionado: string;
  nomeSelecionado: string;
  aoEscolher: (id: string) => void;
}) {
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const lista = useRef<HTMLUListElement>(null);

  // Quando um jogador é escolhido (ou vem pela URL), o campo mostra o nome dele
  useEffect(() => {
    setTexto(nomeSelecionado);
  }, [nomeSelecionado]);

  // Com o nome do escolhido no campo, mostra a lista inteira para facilitar a troca
  const termo = texto === nomeSelecionado ? "" : normalizar(texto);
  const resultados = useMemo(
    () => (termo ? jogadores.filter((j) => normalizar(j.nome).includes(termo)) : jogadores),
    [termo, jogadores]
  );

  useEffect(() => {
    setAtivo(0);
  }, [termo]);

  // Mantém visível a opção destacada pelas setas
  useEffect(() => {
    lista.current?.children[ativo]?.scrollIntoView({ block: "nearest" });
  }, [ativo]);

  function escolher(jogador: Jogador) {
    aoEscolher(String(jogador.id_jogador));
    setTexto(jogador.nome);
    setAberto(false);
  }

  function fechar() {
    setAberto(false);
    setTexto(nomeSelecionado);
  }

  function teclado(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setAberto(true);
      setAtivo((i) => Math.min(i + 1, resultados.length - 1));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setAtivo((i) => Math.max(i - 1, 0));
    } else if (evento.key === "Enter" && aberto && resultados[ativo]) {
      evento.preventDefault();
      escolher(resultados[ativo]);
    } else if (evento.key === "Escape") {
      fechar();
    }
  }

  return (
    <div className="relative">
      <label htmlFor="jogador" className="mb-1 block text-sm font-bold">
        Jogador
      </label>
      <input
        id="jogador"
        role="combobox"
        aria-expanded={aberto}
        aria-controls="lista-jogadores"
        aria-autocomplete="list"
        aria-activedescendant={aberto && resultados[ativo] ? `jogador-${resultados[ativo].id_jogador}` : undefined}
        autoComplete="off"
        className={campo}
        placeholder="Digite o nome do jogador"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAberto(true);
        }}
        onFocus={(e) => {
          e.target.select();
          setAberto(true);
        }}
        onBlur={fechar}
        onKeyDown={teclado}
      />

      {aberto && (
        <ul
          id="lista-jogadores"
          ref={lista}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-[#D9DFD3] bg-white py-1 shadow-lg"
        >
          {resultados.length === 0 ? (
            <li className="px-4 py-3 text-sm text-[#718075]">
              {jogadores.length ? `Nenhum jogador com "${texto.trim()}".` : "Nenhum jogador cadastrado."}
            </li>
          ) : (
            resultados.map((j, i) => (
              <li
                key={j.id_jogador}
                id={`jogador-${j.id_jogador}`}
                role="option"
                aria-selected={String(j.id_jogador) === idSelecionado}
                // mousedown em vez de click: escolhe antes do campo perder o foco
                onMouseDown={(e) => {
                  e.preventDefault();
                  escolher(j);
                }}
                onMouseEnter={() => setAtivo(i)}
                className={
                  "flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm " +
                  (i === ativo ? "bg-[#EDF5D6]" : "")
                }
              >
                <span className="font-semibold">{j.nome}</span>
                <span className="text-xs text-[#718075]">
                  {String(j.id_jogador) === idSelecionado ? "Selecionado" : j.posicao ?? ""}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function FormularioCampeonato({
  idJogador,
  item,
  aoSalvar,
}: {
  idJogador: number;
  item: EstatisticaCampeonato;
  aoSalvar: () => Promise<void>;
}) {
  const [valores, setValores] = useState<Valores>(paraTexto(item.total));
  const [observacao, setObservacao] = useState(item.correcao?.observacao ?? "");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);

  // Depois de salvar ou restaurar, os dados são recarregados: atualiza os campos
  useEffect(() => {
    setValores(paraTexto(item.total));
    setObservacao(item.correcao?.observacao ?? "");
  }, [item]);

  const alterado =
    CAMPOS.some(({ chave }) => valores[chave] !== String(item.total[chave])) ||
    observacao !== (item.correcao?.observacao ?? "");

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setAviso(null);

    if (CAMPOS.some(({ chave }) => valores[chave] === "")) {
      return setAviso({ tipo: "erro", texto: "Preencha todos os campos." });
    }

    setEnviando(true);
    try {
      const resposta = await api<{ mensagem: string }>(
        `/jogadores/${idJogador}/estatisticas/${item.id_campeonato}`,
        {
          method: "PUT",
          body: JSON.stringify({
            gols: Number(valores.gols),
            partidas: Number(valores.partidas),
            cartoes_amarelos: Number(valores.cartoes_amarelos),
            cartoes_vermelhos: Number(valores.cartoes_vermelhos),
            observacao: observacao.trim() || null,
          }),
        }
      );
      await aoSalvar();
      setAviso({ tipo: "ok", texto: resposta.mensagem });
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setEnviando(false);
    }
  }

  async function restaurar() {
    if (!confirm("Remover a correção e voltar aos valores calculados pelo sistema?")) return;
    setAviso(null);
    setEnviando(true);
    try {
      const resposta = await api<{ mensagem: string }>(
        `/jogadores/${idJogador}/estatisticas/${item.id_campeonato}`,
        { method: "DELETE" }
      );
      await aoSalvar();
      setAviso({ tipo: "ok", texto: resposta.mensagem });
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#E5E9E0] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold">{item.campeonato}</h3>
          <p className="text-xs text-[#718075]">{item.esporte || "Esporte não informado"}</p>
        </div>
        {item.correcao && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
            Corrigido manualmente
          </span>
        )}
      </div>

      <form onSubmit={salvar} className="mt-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CAMPOS.map(({ chave, rotulo }) => {
            const calculado = item.calculado[chave];
            const diferente = valores[chave] !== "" && Number(valores[chave]) !== calculado;
            return (
              <div key={chave}>
                <label htmlFor={`${chave}-${item.id_campeonato}`} className="mb-1 block text-sm font-bold">
                  {rotulo}
                </label>
                <input
                  id={`${chave}-${item.id_campeonato}`}
                  type="number"
                  min={0}
                  max={999}
                  step={1}
                  className={campo + " text-center text-lg font-bold tabular-nums"}
                  value={valores[chave]}
                  onChange={(e) => setValores((v) => ({ ...v, [chave]: e.target.value }))}
                />
                <p className={"mt-1 text-xs " + (diferente ? "font-semibold text-amber-700" : "text-[#718075]")}>
                  Sistema: {calculado}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          <label htmlFor={`obs-${item.id_campeonato}`} className="mb-1 block text-sm font-bold">
            Motivo da correção <span className="font-normal text-[#718075]">(opcional)</span>
          </label>
          <input
            id={`obs-${item.id_campeonato}`}
            className={campo}
            maxLength={255}
            placeholder="Ex.: cartão amarelo na 3ª rodada, conferido na súmula"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </div>

        {item.correcao && (
          <p className="mt-3 text-xs text-[#718075]">
            Última correção
            {item.correcao.alterado_por ? ` por ${item.correcao.alterado_por}` : ""} em{" "}
            {new Date(item.correcao.atualizado_em).toLocaleString("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
            .
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" className={botao} disabled={enviando || !alterado}>
            {enviando ? "Salvando..." : "Salvar correção"}
          </button>
          {item.correcao && (
            <button type="button" className={botaoSecundario} disabled={enviando} onClick={restaurar}>
              Voltar aos valores do sistema
            </button>
          )}
          {aviso && (
            <span
              role={aviso.tipo === "erro" ? "alert" : "status"}
              className={"text-sm " + (aviso.tipo === "erro" ? "text-red-700" : "font-semibold text-[#5F7F22]")}
            >
              {aviso.texto}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
