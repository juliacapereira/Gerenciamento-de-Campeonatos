
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Shield,
  Trophy,
  History,
  Users,
} from 'lucide-react'

type Partida = {
  id_partida: number
  id_campeonato: number
  id_time_a: number
  id_time_b: number
  time_a: string
  time_b: string
  data_hora: string | null
  local: string | null
  status: string
  placar_time_a: number | null
  placar_time_b: number | null
}

type Acontecimento = {
  id_acontecimento: number
  id_time: number | null
  id_jogador: number | null
  jogador: string | null
  tipo: string
  minuto: number | null
  descricao: string | null
  criado_em: string
}

type Pontuacao = {
  id_pontuacao: number
  id_time: number
  id_jogador: number | null
  jogador: string | null
  quantidade: number
  minuto: number | null
  criado_em: string
}

type Atleta = {
  id_jogador: number
  nome: string
  numero_camisa: number | null
  posicao: string | null
}

type DetalhesResponse = {
  partida: Partida
  acontecimentos: Acontecimento[]
  pontuacoes: Pontuacao[]
  escalacoes: {
    time_a: Atleta[]
    time_b: Atleta[]
  }
}

type ItemHistorico = {
  chave: string
  minuto: number | null
  criado_em: string
  titulo: string
  id_time: number | null
  jogador: string | null
  descricao: string | null
}

const statusLabels: Record<string, string> = {
  AGENDADA: 'Agendada',
  EM_ANDAMENTO: 'Em andamento',
  ENCERRADA: 'Encerrada',
  ADIADA: 'Adiada',
  CANCELADA: 'Cancelada',
}

function formatDate(value: string | null) {
  if (!value) return 'Data não informada'

  const date = new Date(
    value.includes('T') ? value : value.replace(' ', 'T')
  )

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  })
}

export default function PartidaDetalhesPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [data, setData] = useState<DetalhesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`/api/partidas/${id}`, {
          cache: 'no-store',
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(
            result.erro || 'Não foi possível carregar a partida.'
          )
        }

        if (active) setData(result)
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Erro ao carregar os detalhes da partida.'
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    if (id) void load()

    return () => {
      active = false
    }
  }, [id])

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <p role="status" className="text-sm text-[#747b70]">
          Carregando detalhes da partida...
        </p>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <Link
          href="/campeonatos"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#526d32] hover:underline"
        >
          <ArrowLeft className="size-4" />
          Voltar aos campeonatos
        </Link>

        <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">
          {error || 'Partida não encontrada.'}
        </p>
      </main>
    )
  }

  const { partida, escalacoes } = data

    const hasScore =
    partida.placar_time_a !== null &&
    partida.placar_time_b !== null

  // Gols/pontos e acontecimentos formam uma única linha do tempo.
  const historico: ItemHistorico[] = [
    ...(data.pontuacoes ?? []).map((gol) => ({
      chave: `p-${gol.id_pontuacao}`,
      minuto: gol.minuto,
      criado_em: gol.criado_em,
      titulo: gol.quantidade > 1 ? `Gol/ponto (+${gol.quantidade})` : 'Gol/ponto',
      id_time: gol.id_time,
      jogador: gol.jogador,
      descricao: null,
    })),
    ...(data.acontecimentos ?? []).map((item) => ({
      chave: `a-${item.id_acontecimento}`,
      minuto: item.minuto,
      criado_em: item.criado_em,
      titulo: item.tipo,
      id_time: item.id_time,
      jogador: item.jogador,
      descricao: item.descricao,
    })),
  ].sort((a, b) => {
    if (a.minuto === null && b.minuto !== null) return 1
    if (a.minuto !== null && b.minuto === null) return -1
    if (a.minuto !== null && b.minuto !== null && a.minuto !== b.minuto) {
      return a.minuto - b.minuto
    }
    return a.criado_em.localeCompare(b.criado_em)
  })

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href={`/campeonatos/${partida.id_campeonato}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#526d32] hover:underline"
      >
        <ArrowLeft className="size-4" />
        Voltar ao campeonato
      </Link>

      <section className="mt-6 overflow-hidden rounded-2xl border border-[#e5e7dd] bg-white">
        <div className="bg-[#19382b] px-6 py-8 text-white sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#c6d6a5]">
            Detalhes da partida
          </p>

          <div className="mt-5 flex justify-center">
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
              {statusLabels[partida.status] || partida.status}
            </span>
          </div>

          <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
            <div className="text-center">
              <Shield className="mx-auto mb-3 size-8 text-[#c6d6a5]" />
              <h1 className="break-words font-display text-lg font-bold sm:text-2xl">
                {partida.time_a}
              </h1>
            </div>

            <div className="min-w-16 text-center sm:min-w-24">
              {hasScore ? (
                <p className="font-display text-3xl font-extrabold sm:text-5xl">
                  {partida.placar_time_a} : {partida.placar_time_b}
                </p>
              ) : (
                <p className="font-display text-2xl font-bold text-[#c6d6a5] sm:text-3xl">
                  X
                </p>
              )}
              <p className="mt-2 text-xs text-white/70">
                {hasScore ? 'Placar registrado' : 'Placar indisponível'}
              </p>
            </div>

            <div className="text-center">
              <Shield className="mx-auto mb-3 size-8 text-[#c6d6a5]" />
              <h2 className="break-words font-display text-lg font-bold sm:text-2xl">
                {partida.time_b}
              </h2>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
          <div className="flex items-start gap-3 rounded-xl bg-[#f5f6f0] p-4">
            <CalendarDays className="mt-0.5 size-5 text-[#789339]" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#747b70]">
                Data e horário
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatDate(partida.data_hora)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-[#f5f6f0] p-4">
            <MapPin className="mt-0.5 size-5 text-[#789339]" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#747b70]">
                Local
              </p>
              <p className="mt-1 text-sm font-semibold">
                {partida.local || 'Local não informado'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-[#f5f6f0] p-4 sm:col-span-2">
            <Clock className="mt-0.5 size-5 text-[#789339]" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#747b70]">
                Situação
              </p>
              <p className="mt-1 text-sm font-semibold">
                {statusLabels[partida.status] || partida.status}
              </p>
            </div>
          </div>
        </div>
      </section>

            <section className="mt-6 rounded-2xl border border-[#e5e7dd] bg-white p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Users className="size-6 text-[#789339]" />
          <div>
            <h2 className="font-display text-xl font-bold">
              Escalações
            </h2>
            <p className="mt-1 text-sm text-[#747b70]">
              Elenco ativo de cada equipe.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {[
            { nome: partida.time_a, atletas: escalacoes?.time_a ?? [] },
            { nome: partida.time_b, atletas: escalacoes?.time_b ?? [] },
          ].map((time) => (
            <div key={time.nome}>
              <h3 className="font-display font-bold">{time.nome}</h3>

              {time.atletas.length === 0 ? (
                <p className="mt-3 rounded-xl bg-[#f5f6f0] p-4 text-sm text-[#747b70]">
                  Nenhum jogador no elenco.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-[#e5e7dd] rounded-xl border border-[#e5e7dd]">
                  {time.atletas.map((atleta) => (
                    <li
                      key={atleta.id_jogador}
                      className="flex items-center gap-3 px-4 py-3 text-sm"
                    >
                      <span className="w-8 shrink-0 text-center font-bold text-[#526d32]">
                        {atleta.numero_camisa ?? '–'}
                      </span>
                      <span className="min-w-0 flex-1 break-words font-semibold">
                        {atleta.nome}
                      </span>
                      {atleta.posicao && (
                        <span className="shrink-0 text-xs text-[#747b70]">
                          {atleta.posicao}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[#e5e7dd] bg-white p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <History className="size-6 text-[#789339]" />
          <div>
            <h2 className="font-display text-xl font-bold">
              Histórico da partida
            </h2>
            <p className="mt-1 text-sm text-[#747b70]">
              Acontecimentos registrados até o momento.
            </p>
          </div>
        </div>

        {historico.length === 0 ? (
          <div className="mt-6 rounded-xl bg-[#f5f6f0] p-5 text-center">
            <Trophy className="mx-auto mb-3 size-7 text-[#789339]" />
            <p className="text-sm font-semibold">
              Nenhum acontecimento registrado
            </p>
            <p className="mt-1 text-sm text-[#747b70]">
              O histórico será exibido aqui quando houver registros.
            </p>
          </div>
        ) : (
          <ol className="mt-6 space-y-4">
            {historico.map((item) => {
              const teamName =
                item.id_time === partida.id_time_a
                  ? partida.time_a
                  : item.id_time === partida.id_time_b
                    ? partida.time_b
                    : null

              return (
                <li
                  key={item.chave}
                  className="rounded-xl border border-[#e5e7dd] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {item.minuto !== null && (
                      <span className="rounded-md bg-[#edf1e4] px-2 py-1 text-xs font-bold text-[#526d32]">
                        {item.minuto}&apos;
                      </span>
                    )}

                   <span className="font-semibold">
                      {item.titulo}
                    </span>
                  </div>

                  {item.jogador && (
                    <p className="mt-2 text-sm font-semibold">
                      Jogador: {item.jogador}
                    </p>
                  )}

                  {teamName && (
                    <p className="mt-2 text-sm text-[#526d32]">
                      Time: {teamName}
                    </p>
                  )}

                  {item.descricao && (
                    <p className="mt-2 text-sm text-[#747b70]">
                      {item.descricao}
                    </p>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </main>
  )
}
