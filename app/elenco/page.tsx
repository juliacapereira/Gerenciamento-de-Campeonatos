"use client";

import { useState } from "react";
import { useAdmin } from "@/hooks/use-admin";

const API = "/api";

type JogadorElenco = {
  id_elenco: number;
  id_jogador: number;
  nome: string;
  numero_camisa: number | null;
  posicao: string | null;
};

export default function ElencoPage() {
  const { isAdmin, carregando } = useAdmin();

  const [idTime, setIdTime] = useState("");
  const [jogadores, setJogadores] = useState<JogadorElenco[]>([]);

  const [idJogador, setIdJogador] = useState("");
  const [camisa, setCamisa] = useState("");
  const [posicao, setPosicao] = useState("");

  const [mensagem, setMensagem] = useState("");

  // GET /api/times/:id_time/jogadores
  async function carregarElenco() {
    if (!idTime) {
      setMensagem("Informe o ID do time.");
      return;
    }

    try {
      const resposta = await fetch(
        `${API}/times/${idTime}/jogadores`
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        setMensagem(dados.erro);
        return;
      }

      setJogadores(dados);
      setMensagem("");
    } catch {
      setMensagem(
        "Não foi possível conectar ao servidor."
      );
    }
  }

  // POST /api/times/:id_time/jogadores
  async function adicionarJogador() {
    if (!isAdmin) {
      setMensagem(
        "Apenas administradores podem adicionar jogadores ao time."
      );
      return;
    }

    if (!idTime || !idJogador) {
      setMensagem(
        "Informe o ID do time e o ID do jogador."
      );
      return;
    }

    try {
      const resposta = await fetch(
        `${API}/times/${idTime}/jogadores`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            id_jogador: Number(idJogador),
            numero_camisa:
              camisa === ""
                ? null
                : Number(camisa),
            posicao: posicao || null,
          }),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        setMensagem(dados.erro);
        return;
      }

      setMensagem(dados.mensagem);

      setIdJogador("");
      setCamisa("");
      setPosicao("");

      await carregarElenco();
    } catch {
      setMensagem(
        "Não foi possível conectar ao servidor."
      );
    }
  }

  // DELETE /api/times/:id_time/jogadores/:id_jogador
  async function removerJogador(id: number) {
    if (!isAdmin) {
      setMensagem(
        "Apenas administradores podem remover jogadores do time."
      );
      return;
    }

    try {
      const resposta = await fetch(
        `${API}/times/${idTime}/jogadores/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const dados = await resposta.json();

      setMensagem(
        resposta.ok
          ? dados.mensagem
          : dados.erro
      );

      if (resposta.ok) {
        await carregarElenco();
      }
    } catch {
      setMensagem(
        "Não foi possível conectar ao servidor."
      );
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">

      <h1 className="mb-6 text-2xl font-bold">
        Elenco do time
      </h1>

      {/* CONSULTA PÚBLICA */}
      <section className="mb-6 flex gap-2">
        <input
          className="flex-1 rounded border p-2"
          type="number"
          placeholder="ID do time"
          value={idTime}
          onChange={(e) =>
            setIdTime(e.target.value)
          }
        />

        <button
          className="rounded bg-black px-4 py-2 text-white"
          onClick={carregarElenco}
        >
          Ver elenco
        </button>
      </section>


      {/* ÁREA EXCLUSIVA DO ADMINISTRADOR */}
      {!carregando && isAdmin && (
        <section className="mb-6 rounded border p-4">

          <h2 className="mb-3 font-semibold">
            Adicionar jogador
          </h2>

          <div className="flex flex-col gap-2">

            <input
              className="rounded border p-2"
              type="number"
              placeholder="ID do jogador"
              value={idJogador}
              onChange={(e) =>
                setIdJogador(e.target.value)
              }
            />

            <input
              className="rounded border p-2"
              type="number"
              placeholder="Número da camisa (opcional)"
              value={camisa}
              onChange={(e) =>
                setCamisa(e.target.value)
              }
            />

            <input
              className="rounded border p-2"
              type="text"
              placeholder="Posição (opcional)"
              value={posicao}
              onChange={(e) =>
                setPosicao(e.target.value)
              }
            />

            <button
              className="rounded bg-black px-4 py-2 text-white"
              onClick={adicionarJogador}
            >
              Adicionar
            </button>

          </div>
        </section>
      )}


      {/* AVISO PARA VISITANTE */}
      {!carregando && !isAdmin && (
        <section className="mb-6 rounded border bg-gray-50 p-4">

          <p className="text-sm text-gray-600">
            A consulta do elenco é pública.
            Para adicionar ou remover jogadores,
            é necessário entrar como administrador.
          </p>

        </section>
      )}


      {/* MENSAGENS */}
      {mensagem && (
        <p className="mb-6 rounded bg-gray-100 p-3">
          {mensagem}
        </p>
      )}


      {/* LISTAGEM PÚBLICA */}
      <section>

        <h2 className="mb-3 font-semibold">
          Jogadores
        </h2>

        {jogadores.length === 0 ? (
          <p className="text-gray-500">
            Nenhum jogador neste time.
          </p>
        ) : (
          <ul className="divide-y rounded border">

            {jogadores.map((j) => (
              <li
                key={j.id_elenco}
                className="flex items-center justify-between p-3"
              >

                <span>
                  {j.numero_camisa !== null && (
                    <strong>
                      {j.numero_camisa} -{" "}
                    </strong>
                  )}

                  {j.nome}

                  {j.posicao && (
                    <span className="text-gray-500">
                      {" "}
                      ({j.posicao})
                    </span>
                  )}
                </span>


                {/* SOMENTE ADMIN */}
                {!carregando && isAdmin && (
                  <button
                    className="text-red-600"
                    onClick={() =>
                      removerJogador(j.id_jogador)
                    }
                  >
                    Remover
                  </button>
                )}

              </li>
            ))}

          </ul>
        )}

      </section>

    </main>
  );
}