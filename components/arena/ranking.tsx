'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Award, Trophy } from 'lucide-react'
import { request } from './api'

type RankingEntry = {
  id_jogador: number | string
  jogador_nome: string
  jogador_posicao: string | null
  id_time: number | string
  time_nome: string
  total_pontos: number | string
}

type Props = {
  championshipId: string
}

export function RankingSection({ championshipId }: Props) {
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    request<RankingEntry[]>(
      `campeonatos/${encodeURIComponent(championshipId)}/ranking`
    ).then(data => {
      if (active) setRanking(data)
    }).catch(err => {
      if (active) {
        setError(err instanceof Error ? err.message : 'Não foi possível carregar o ranking.')
      }
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }
  }, [championshipId, attempt])

  return (
    <section className="mt-6 rounded-2xl border border-[#e5e7dd] bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#829c38]">
            Desempenho
          </p>
          <h2 className="font-display text-2xl font-bold">Ranking de artilharia</h2>
          <p className="mt-2 text-sm text-[#747b70]">
            Jogadores com gols ou pontos registrados neste campeonato.
          </p>
        </div>
        <Trophy className="size-8 text-[#789339]" aria-hidden="true" />
      </div>

      {loading ? (
        <p className="arena-empty mt-6" role="status">Carregando ranking...</p>
      ) : error ? (
        <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-800" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="arena-secondary mt-3"
            onClick={() => setAttempt(value => value + 1)}
          >
            Tentar novamente
          </button>
        </div>
      ) : ranking.length === 0 ? (
        <div className="arena-empty mt-6">
          <Award className="mx-auto mb-4 size-9 text-[#829c38]" aria-hidden="true" />
          <h3 className="font-display text-xl font-bold">Nenhum ponto registrado</h3>
          <p className="mt-2 text-sm text-[#7d8378]">
            O ranking será exibido quando houver gols ou pontos associados a jogadores.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[#e5e7dd]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#edf1e4] text-[#19382b]">
              <tr>
                <th scope="col" className="whitespace-nowrap p-3">Posição</th>
                <th scope="col" className="whitespace-nowrap p-3">Jogador</th>
                <th scope="col" className="whitespace-nowrap p-3">Posição em campo</th>
                <th scope="col" className="whitespace-nowrap p-3">Time</th>
                <th scope="col" className="whitespace-nowrap p-3 text-right">Gols/Pontos</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((entry, index) => (
                <tr
                  key={`${entry.id_jogador}-${entry.id_time}`}
                  className={index === 0 ? 'bg-[#f5f7ef]' : 'border-t border-[#e5e7dd]'}
                >
                  <td className="whitespace-nowrap p-3 font-semibold">
                    {index + 1}º
                  </td>
                  <th scope="row" className="whitespace-nowrap p-3 font-semibold">
                    <Link className="underline decoration-[#829c38] underline-offset-2" href={`/jogadores/${entry.id_jogador}`}>
                      {entry.jogador_nome}
                    </Link>
                  </th>
                  <td className="whitespace-nowrap p-3 text-[#747b70]">
                    {entry.jogador_posicao || 'Não informada'}
                  </td>
                  <td className="whitespace-nowrap p-3">
                    <Link className="underline decoration-[#829c38] underline-offset-2" href={`/times/${entry.id_time}`}>
                      {entry.time_nome}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap p-3 text-right font-bold text-[#19382b]">
                    {Number(entry.total_pontos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
