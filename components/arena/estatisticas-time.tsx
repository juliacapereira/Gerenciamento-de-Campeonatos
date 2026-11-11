'use client'

import { useEffect, useState } from 'react'
import { request } from './api'

type Statistics = {
  partidas: number
  vitorias: number
  empates: number
  derrotas: number
  marcados: number
  sofridos: number
  saldo: number
  pontos: number | null
  aproveitamento: number | null
}

export function TeamStatistics({ id }: { id: string }) {
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let pending = false
    setStatistics(null)
    setError('')
    async function load() {
      if (pending || controller.signal.aborted) return
      pending = true
      try {
        const data = await request<Statistics>(`times/${id}/estatisticas`, { signal: controller.signal })
        if (!controller.signal.aborted) { setStatistics(data); setError('') }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas.')
      } finally { pending = false }
    }
    function refresh() { if (!document.hidden) void load() }
    void load()
    const timer = window.setInterval(refresh, 15000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      controller.abort()
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [id, attempt])

  const metrics = statistics ? [
    ['Partidas', statistics.partidas], ['Vitórias', statistics.vitorias],
    ['Empates', statistics.empates], ['Derrotas', statistics.derrotas],
    ['Gols/pontos marcados', statistics.marcados], ['Gols/pontos sofridos', statistics.sofridos],
    ['Saldo', statistics.saldo], ['Pontos na classificação', statistics.pontos ?? '—'],
    ['Aproveitamento', statistics.aproveitamento == null ? '—' : `${statistics.aproveitamento.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`],
  ] : []

  return <section className="my-6 rounded-2xl border border-[#e5e7dd] bg-white p-6 sm:p-8" aria-labelledby="team-statistics-title">
    <h2 id="team-statistics-title" className="font-display text-2xl font-bold">Estatísticas do time</h2>
    <p className="mt-2 text-sm text-[#747b70]">Resultados de todos os campeonatos. Atualização automática a cada 15 segundos.</p>
    {error ? <div role="alert" className="mt-4 text-sm text-red-800">{error}<button className="arena-secondary ml-3" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div> : !statistics ? <p role="status" className="mt-4">Carregando estatísticas...</p> : <>
      {statistics.partidas === 0 && <p className="mt-4 text-sm text-[#747b70]">O time ainda não tem partidas encerradas com resultado registrado.</p>}
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map(([label, value]) => <div key={label} className="rounded-xl bg-[#f1f2eb] p-4"><dt className="text-xs text-[#747b70]">{label}</dt><dd className="mt-2 text-2xl font-bold">{value}</dd></div>)}
      </dl>
      <p className="mt-4 text-xs text-[#747b70]">{statistics.aproveitamento == null ? 'Configure as regras de pontuação do esporte para calcular os pontos e o aproveitamento.' : 'Aproveitamento: pontos obtidos divididos pelos pontos possíveis em vitórias, conforme as regras do esporte.'}</p>
    </>}
  </section>
}
