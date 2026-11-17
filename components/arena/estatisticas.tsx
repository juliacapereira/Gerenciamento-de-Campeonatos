'use client'

// US24 - Estatísticas de jogadores (perfil estatístico público).
// Aparece dentro da página do jogador (/jogadores/[id]).

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BarChart3, Pencil } from 'lucide-react'
import { request } from './api'
import { useAdmin } from '@/hooks/use-admin'

export type Numeros = {
  gols: number
  partidas: number
  cartoes_amarelos: number
  cartoes_vermelhos: number
}

export type EstatisticaCampeonato = {
  id_campeonato: number
  campeonato: string
  esporte: string | null
  status: string
  calculado: Numeros
  total: Numeros
  corrigido: boolean
  correcao: {
    observacao: string | null
    alterado_por: string | null
    atualizado_em: string
  } | null
}

type Evento = {
  tipo: 'PONTUACAO' | 'CARTAO_AMARELO' | 'CARTAO_VERMELHO'
  quantidade: number
  minuto: number | null
  id_partida: number
  data_hora: string
  campeonato: string
  time_a: string
  time_b: string
}

export type Estatisticas = {
  jogador: { id_jogador: number; nome: string; posicao: string | null }
  total: Numeros
  campeonatos: EstatisticaCampeonato[]
  historico: Evento[]
}

const dataCurta = (valor: string) =>
  new Date(valor).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

function Cartao({ cor }: { cor: 'amarelo' | 'vermelho' }) {
  return (
    <span
      aria-hidden="true"
      className={
        'inline-block h-4 w-3 shrink-0 rounded-[2px] ' +
        (cor === 'amarelo' ? 'bg-[#f2c94c]' : 'bg-[#d64545]')
      }
    />
  )
}

export function PlayerStats({ id }: { id: string }) {
  const { isAdmin } = useAdmin()
  const [dados, setDados] = useState<Estatisticas | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    request<Estatisticas>(`jogadores/${encodeURIComponent(id)}/estatisticas`)
      .then(d => { if (ativo) setDados(d) })
      .catch(e => { if (ativo) setErro(e.message) })
    return () => { ativo = false }
  }, [id])

  return (
    <section
      aria-labelledby="estatisticas-title"
      className="mt-6 max-w-3xl rounded-2xl border border-[#e5e7dd] bg-white p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="estatisticas-title" className="flex items-center gap-2 font-display text-2xl font-bold">
          <BarChart3 className="size-6 text-[#789339]" />
          Estatísticas
        </h2>

        {isAdmin && (
          <Link className="arena-secondary" href={`/admin/estatisticas?jogador=${id}`}>
            <Pencil className="size-4" />
            Corrigir estatísticas
          </Link>
        )}
      </div>

      {erro ? (
        <p className="mt-4 text-sm text-red-700">{erro}</p>
      ) : !dados ? (
        <p className="mt-4 text-sm text-[#7d8378]">Carregando estatísticas...</p>
      ) : (
        <>
          {/* Totais */}
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Gols/pontos', dados.total.gols, null],
              ['Partidas', dados.total.partidas, null],
              ['Amarelos', dados.total.cartoes_amarelos, 'amarelo'],
              ['Vermelhos', dados.total.cartoes_vermelhos, 'vermelho'],
            ].map(([rotulo, valor, cor]) => (
              <div key={rotulo as string} className="rounded-xl bg-[#f4f6ee] px-4 py-3">
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-[#5f6a5a]">
                  {cor && <Cartao cor={cor as 'amarelo' | 'vermelho'} />}
                  {rotulo}
                </dt>
                <dd className="mt-1 font-display text-3xl font-bold tabular-nums text-[#19382b]">
                  {valor}
                </dd>
              </div>
            ))}
          </dl>

          {/* Por campeonato */}
          <h3 className="mt-8 text-sm font-bold text-[#19382b]">Por campeonato</h3>
          {dados.campeonatos.length === 0 ? (
            <p className="mt-2 text-sm text-[#7d8378]">
              O atleta ainda não participou de nenhum campeonato.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e5e7dd] text-xs text-[#7d8378]">
                    <th className="py-2 pr-3 font-semibold">Campeonato</th>
                    <th className="px-2 py-2 text-center font-semibold">Gols/pts</th>
                    <th className="px-2 py-2 text-center font-semibold">Partidas</th>
                    <th className="px-2 py-2 text-center font-semibold">
                      <span className="sr-only">Cartões amarelos</span>
                      <Cartao cor="amarelo" />
                    </th>
                    <th className="px-2 py-2 text-center font-semibold">
                      <span className="sr-only">Cartões vermelhos</span>
                      <Cartao cor="vermelho" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef0e8]">
                  {dados.campeonatos.map(c => (
                    <tr key={c.id_campeonato}>
                      <td className="py-3 pr-3">
                        <Link
                          href={`/campeonatos/${c.id_campeonato}`}
                          className="font-semibold hover:text-[#789339]"
                        >
                          {c.campeonato}
                        </Link>
                        <p className="text-xs text-[#7d8378]">
                          {c.esporte || 'Esporte não informado'}
                          {c.corrigido && ' · inclui correção da organização'}
                        </p>
                      </td>
                      <td className="px-2 py-3 text-center font-bold tabular-nums">{c.total.gols}</td>
                      <td className="px-2 py-3 text-center tabular-nums">{c.total.partidas}</td>
                      <td className="px-2 py-3 text-center tabular-nums">{c.total.cartoes_amarelos}</td>
                      <td className="px-2 py-3 text-center tabular-nums">{c.total.cartoes_vermelhos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Histórico */}
          <h3 className="mt-8 text-sm font-bold text-[#19382b]">Histórico</h3>
          {dados.historico.length === 0 ? (
            <p className="mt-2 text-sm text-[#7d8378]">
              Nenhum gol, ponto ou cartão registrado nas partidas.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-[#eef0e8]">
              {dados.historico.map((ev, i) => (
                <li key={`${ev.tipo}-${ev.id_partida}-${i}`} className="flex items-start gap-3 py-3 text-sm">
                  <span className="mt-0.5 w-12 shrink-0 text-xs font-semibold tabular-nums text-[#7d8378]">
                    {ev.minuto !== null ? `${ev.minuto}'` : '–'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-semibold">
                      {ev.tipo === 'PONTUACAO' ? (
                        ev.quantidade > 1 ? `${ev.quantidade} pontos` : 'Gol/ponto'
                      ) : (
                        <>
                          <Cartao cor={ev.tipo === 'CARTAO_VERMELHO' ? 'vermelho' : 'amarelo'} />
                          {ev.tipo === 'CARTAO_VERMELHO' ? 'Cartão vermelho' : 'Cartão amarelo'}
                        </>
                      )}
                    </p>
                    <Link
                      href={`/partidas/${ev.id_partida}`}
                      className="text-xs text-[#7d8378] hover:text-[#789339]"
                    >
                      {ev.time_a} x {ev.time_b} · {ev.campeonato} · {dataCurta(ev.data_hora)}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-6 border-t border-[#e5e7dd] pt-4 text-xs text-[#7d8378]">
            Partidas contam os jogos encerrados do time do atleta no campeonato.
          </p>
        </>
      )}
    </section>
  )
}
