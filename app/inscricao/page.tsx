"use client";

import { useState } from "react";

const API = "/api";

type TimeInscrito = {
  id_campeonato_time: number;
  id_time: number;
  nome: string;
  cidade: string | null;
};

export default function InscricaoPage() {
  const [idCampeonato, setIdCampeonato] = useState("");
  const [times, setTimes] = useState<TimeInscrito[]>([]);
  const [idTime, setIdTime] = useState("");
  const [mensagem, setMensagem] = useState("");

  // GET /api/campeonatos/:id_campeonato/times
  async function carregarInscritos() {
    if (!idCampeonato) return setMensagem("Informe o ID do campeonato.");

    try {
      const resposta = await fetch(`${API}/campeonatos/${idCampeonato}/times`);
      const dados = await resposta.json();

      if (!resposta.ok) return setMensagem(dados.erro);
      setTimes(dados);
    } catch {
      setMensagem("Não foi possível conectar ao servidor.");
    }
  }

  // POST /api/campeonatos/:id_campeonato/times
  async function inscreverTime() {
    if (!idCampeonato || !idTime) return setMensagem("Informe o ID do campeonato e o ID do time.");

    try {
      const resposta = await fetch(`${API}/campeonatos/${idCampeonato}/times`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_time: Number(idTime) })
      });
      const dados = await resposta.json();

      if (!resposta.ok) return setMensagem(dados.erro);

      setMensagem(dados.mensagem);
      setIdTime("");
      carregarInscritos();
    } catch {
      setMensagem("Não foi possível conectar ao servidor.");
    }
  }

  // DELETE /api/campeonatos/:id_campeonato/times/:id_time
  async function removerInscricao(id: number) {
    try {
      const resposta = await fetch(`${API}/campeonatos/${idCampeonato}/times/${id}`, { method: "DELETE" });
      const dados = await resposta.json();

      setMensagem(resposta.ok ? dados.mensagem : dados.erro);
      if (resposta.ok) carregarInscritos();
    } catch {
      setMensagem("Não foi possível conectar ao servidor.");
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Inscrição de times</h1>

      <section className="mb-6 flex gap-2">
        <input
          className="flex-1 rounded border p-2"
          type="number"
          placeholder="ID do campeonato"
          value={idCampeonato}
          onChange={(e) => setIdCampeonato(e.target.value)}
        />
        <button className="rounded bg-black px-4 py-2 text-white" onClick={carregarInscritos}>
          Ver inscritos
        </button>
      </section>

      <section className="mb-6 rounded border p-4">
        <h2 className="mb-3 font-semibold">Inscrever time</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border p-2"
            type="number"
            placeholder="ID do time"
            value={idTime}
            onChange={(e) => setIdTime(e.target.value)}
          />
          <button className="rounded bg-black px-4 py-2 text-white" onClick={inscreverTime}>
            Inscrever
          </button>
        </div>
      </section>

      {mensagem && <p className="mb-6 rounded bg-gray-100 p-3">{mensagem}</p>}

      <section>
        <h2 className="mb-3 font-semibold">Times inscritos</h2>
        {times.length === 0 ? (
          <p className="text-gray-500">Nenhum time inscrito neste campeonato.</p>
        ) : (
          <ul className="divide-y rounded border">
            {times.map((t) => (
              <li key={t.id_campeonato_time} className="flex items-center justify-between p-3">
                <span>
                  {t.nome}
                  {t.cidade && <span className="text-gray-500"> ({t.cidade})</span>}
                </span>
                <button className="text-red-600" onClick={() => removerInscricao(t.id_time)}>
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
