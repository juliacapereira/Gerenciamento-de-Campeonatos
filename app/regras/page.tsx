"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/auth/admin-guard";

// US19 - Regras de pontuação

type Regra = {
  id_esporte: number;
  esporte: string;
  configurada: boolean;
  pontos_vitoria: number | null;
  pontos_empate: number | null;
  pontos_derrota: number | null;
};

// Valores digitados no formulário de cada esporte (texto, para permitir campo vazio)
type Valores = { vitoria: string; empate: string; derrota: string };

type Aviso = { tipo: "ok" | "erro"; texto: string } | null;

// Sugestão inicial para esportes que ainda não têm regra
const PADRAO: Valores = { vitoria: "3", empate: "1", derrota: "0" };

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

function valoresDe(regra: Regra): Valores {
  if (!regra.configurada) return PADRAO;
  return {
    vitoria: String(regra.pontos_vitoria),
    empate: String(regra.pontos_empate),
    derrota: String(regra.pontos_derrota),
  };
}

const campo =
  "w-full rounded-xl border border-[#D9DFD3] bg-white px-3 py-2.5 text-center text-lg font-bold tabular-nums outline-none focus:border-[#173629] focus:ring-2 focus:ring-[#D5F36A]";
const botao =
  "rounded-xl bg-[#173629] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#28523C] disabled:cursor-not-allowed disabled:opacity-50";

export default function RegrasPage() {
  return (
    <AdminGuard>
      <Regras />
    </AdminGuard>
  );
}

function Regras() {
  const [regras, setRegras] = useState<Regra[]>([]);
  const [valores, setValores] = useState<Record<number, Valores>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<number | null>(null);
  const [avisos, setAvisos] = useState<Record<number, Aviso>>({});
  const [erroGeral, setErroGeral] = useState("");

  async function carregar() {
    try {
      const lista = await api<Regra[]>("/regras-pontuacao");
      setRegras(lista);
      setValores(Object.fromEntries(lista.map((r) => [r.id_esporte, valoresDe(r)])));
    } catch (e) {
      setErroGeral((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function alterar(id: number, chave: keyof Valores, valor: string) {
    setValores((atual) => ({ ...atual, [id]: { ...atual[id], [chave]: valor } }));
    setAvisos((atual) => ({ ...atual, [id]: null }));
  }

  async function salvar(evento: FormEvent<HTMLFormElement>, regra: Regra) {
    evento.preventDefault();
    const v = valores[regra.id_esporte];

    if (v.vitoria === "" || v.empate === "" || v.derrota === "") {
      return setAvisos((a) => ({
        ...a,
        [regra.id_esporte]: { tipo: "erro", texto: "Preencha os três valores." },
      }));
    }

    setSalvando(regra.id_esporte);
    try {
      const resposta = await api<{ mensagem: string }>(`/esportes/${regra.id_esporte}/regra-pontuacao`, {
        method: "PUT",
        body: JSON.stringify({
          pontos_vitoria: Number(v.vitoria),
          pontos_empate: Number(v.empate),
          pontos_derrota: Number(v.derrota),
        }),
      });

      // Atualiza a regra salva na lista, sem recarregar a página toda
      setRegras((lista) =>
        lista.map((r) =>
          r.id_esporte === regra.id_esporte
            ? {
                ...r,
                configurada: true,
                pontos_vitoria: Number(v.vitoria),
                pontos_empate: Number(v.empate),
                pontos_derrota: Number(v.derrota),
              }
            : r
        )
      );
      setAvisos((a) => ({ ...a, [regra.id_esporte]: { tipo: "ok", texto: resposta.mensagem } }));
    } catch (e) {
      setAvisos((a) => ({ ...a, [regra.id_esporte]: { tipo: "erro", texto: (e as Error).message } }));
    } finally {
      setSalvando(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#FAFAF7] text-[#173629]">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link href="/admin" className="text-sm font-semibold text-[#86A535] hover:underline">
          ← Voltar ao painel
        </Link>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Regras de pontuação</h1>
        <p className="mt-1 max-w-prose text-sm text-[#718075]">
          Defina quantos pontos cada resultado vale em cada esporte. A tabela de classificação usa
          esses valores na hora, inclusive nos jogos que já aconteceram.
        </p>

        {erroGeral && (
          <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {erroGeral}
          </p>
        )}

        {carregando ? (
          <p className="mt-8 text-sm text-[#718075]">Carregando esportes...</p>
        ) : regras.length === 0 && !erroGeral ? (
          <p className="mt-8 text-sm text-[#718075]">
            Nenhum esporte cadastrado. Cadastre um esporte para definir as regras dele.
          </p>
        ) : (
          <div className="mt-8 grid gap-5">
            {regras.map((regra) => {
              const v = valores[regra.id_esporte] ?? PADRAO;
              const aviso = avisos[regra.id_esporte];
              const salvo = valoresDe(regra);
              const alterado =
                !regra.configurada ||
                v.vitoria !== salvo.vitoria ||
                v.empate !== salvo.empate ||
                v.derrota !== salvo.derrota;

              // Exemplo de aplicação: 2 vitórias, 1 empate e 1 derrota
              const exemplo =
                2 * (Number(v.vitoria) || 0) + (Number(v.empate) || 0) + (Number(v.derrota) || 0);

              return (
                <section
                  key={regra.id_esporte}
                  className="rounded-2xl border border-[#E5E9E0] bg-white p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-extrabold">{regra.esporte}</h2>
                    <span
                      className={
                        "rounded-full px-3 py-1 text-xs font-bold " +
                        (regra.configurada
                          ? "bg-[#EDF5D6] text-[#173629]"
                          : "bg-amber-50 text-amber-800 ring-1 ring-amber-200")
                      }
                    >
                      {regra.configurada ? "Configurado" : "Sem regra: a classificação não aparece"}
                    </span>
                  </div>

                  <form onSubmit={(e) => salvar(e, regra)} className="mt-5">
                    <div className="grid grid-cols-3 gap-3 sm:max-w-md">
                      {(
                        [
                          ["vitoria", "Vitória"],
                          ["empate", "Empate"],
                          ["derrota", "Derrota"],
                        ] as const
                      ).map(([chave, rotulo]) => (
                        <div key={chave}>
                          <label
                            htmlFor={`${chave}-${regra.id_esporte}`}
                            className="mb-1 block text-sm font-bold"
                          >
                            {rotulo}
                          </label>
                          <input
                            id={`${chave}-${regra.id_esporte}`}
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            className={campo}
                            value={v[chave]}
                            onChange={(e) => alterar(regra.id_esporte, chave, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>

                    <p className="mt-3 text-sm text-[#718075]">
                      Exemplo: um time com 2 vitórias, 1 empate e 1 derrota soma{" "}
                      <strong className="text-[#173629]">{exemplo} pontos</strong>.
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="submit"
                        className={botao}
                        disabled={salvando === regra.id_esporte || !alterado}
                      >
                        {salvando === regra.id_esporte
                          ? "Salvando..."
                          : regra.configurada
                            ? "Salvar alterações"
                            : "Salvar regras"}
                      </button>

                      {aviso && (
                        <span
                          role={aviso.tipo === "erro" ? "alert" : "status"}
                          className={
                            "text-sm " + (aviso.tipo === "erro" ? "text-red-700" : "font-semibold text-[#5F7F22]")
                          }
                        >
                          {aviso.texto}
                        </span>
                      )}
                    </div>
                  </form>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
