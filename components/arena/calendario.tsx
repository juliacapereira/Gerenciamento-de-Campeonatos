'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Header, Footer } from './arena-home'
import { request } from './api'

type Match = { id_partida: number; id_campeonato: number; id_time_a: number; id_time_b: number; data_hora: string; local: string | null; status: string; campeonato: string; esporte: string; time_a: string; time_b: string; placar_time_a: number | null; placar_time_b: number | null }
type Option = { id_campeonato?: number; id_esporte?: number; id_time?: number; nome: string }
type Championship = { id_campeonato: number; nome: string; esporte: string; data_inicial: string; data_fim: string; status: string }
const championshipStatuses: Record<string, string> = { PLANEJADO: 'Planejado', INSCRICOES: 'Inscrições abertas', EM_ANDAMENTO: 'Em andamento', ENCERRADO: 'Encerrado' }
type Summary = { campeonato: Championship; times: number; partidas: number; status: Record<string, number>; proximos_jogos: Match[]; ultimos_resultados: Match[] }
const statuses: Record<string, string> = { AGENDADA: 'Agendada', EM_ANDAMENTO: 'Em andamento', ENCERRADA: 'Encerrada', ADIADA: 'Adiada', CANCELADA: 'Cancelada' }
const date = (value?: string | null) => {
  if (!value) return 'Data a definir'
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')
}
const hour = (value?: string | null) => (value && value.length >= 16 ? value.slice(11, 16) : '')
export function MatchList({ games, empty = 'Nenhuma partida encontrada.' }: { games: Match[]; empty?: string }) {
  if (!games.length) return <p className="py-5 text-sm text-[#7d8378]">{empty}</p>
  return <ul className="grid gap-3">{games.map(game => <li key={game.id_partida} className="rounded-xl border border-[#e5e7dd] bg-white p-5">
    <div className="flex flex-wrap justify-between gap-2 text-xs text-[#747b70]"><Link className="font-bold underline" href={`/campeonatos/${game.id_campeonato}`}>{game.campeonato} · {game.esporte}</Link><span>{statuses[game.status]}</span></div>
    <p className="my-3 flex flex-wrap items-center gap-3 font-bold"><Link href={`/times/${game.id_time_a}`}>{game.time_a}</Link><span className="rounded-lg bg-[#eef1e5] px-3 py-1">{game.placar_time_a !== null && game.placar_time_b !== null ? `${game.placar_time_a} × ${game.placar_time_b}` : '×'}</span><Link href={`/times/${game.id_time_b}`}>{game.time_b}</Link></p>
    <p className="text-sm text-[#747b70]">
      {game.data_hora ? (
        <time dateTime={game.data_hora}>{date(game.data_hora)}{hour(game.data_hora) && ` às ${hour(game.data_hora)}`}</time>
      ) : 'Data a definir'}
      {' · '}{game.local || 'Local a definir'}
    </p>
    <Link className="mt-3 inline-block text-sm font-bold underline" href={`/partidas/${game.id_partida}`}>Ver detalhes da partida →</Link>
  </li>)}</ul>
}

export function ChampionshipSummary({ id }: { id: string }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setSummary(null); setError('')
    request<Summary>(`campeonatos/${id}/resumo`).then(data => { if (active) setSummary(data) }).catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [id, attempt])
  return <section className="mt-6 rounded-2xl border border-[#e5e7dd] bg-white p-6 sm:p-8" aria-labelledby="summary-title">
    <h2 id="summary-title" className="font-display text-2xl font-bold">Resumo do campeonato</h2>
    {error ? <div role="alert" className="mt-4 text-sm text-red-800">{error}<button className="arena-secondary mt-3" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div> : !summary ? <p role="status" className="mt-4">Carregando resumo...</p> : <>
      <p className="mt-4 text-sm text-[#747b70]">{summary.campeonato.nome} · {summary.campeonato.esporte} · {date(summary.campeonato.data_inicial)} — {date(summary.campeonato.data_fim)} · {championshipStatuses[summary.campeonato.status]}</p>
      <nav aria-label="Navegação do campeonato" className="mt-5 flex flex-wrap gap-3">
        <Link className="arena-secondary" href={`/classificacao?campeonato=${id}`}>Classificação</Link>
        <Link className="arena-secondary" href={`/jogos?campeonato=${id}`}>Calendário</Link>
        <Link className="arena-secondary" href="#times-participantes">Times participantes</Link>
      </nav>
      <dl className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Times inscritos', summary.times], ['Partidas', summary.partidas], ...Object.entries(statuses).map(([key, label]) => [label, summary.status[key]])].map(([label, value]) => <div key={label} className="rounded-xl bg-[#f1f2eb] p-4"><dt className="text-xs text-[#747b70]">{label}</dt><dd className="mt-2 text-2xl font-bold">{value}</dd></div>)}</dl>
      <div className="grid gap-6 lg:grid-cols-2"><div><h3 className="mb-3 font-bold">Próximos jogos e partidas em andamento</h3><MatchList games={summary.proximos_jogos} empty="Nenhum jogo agendado ou em andamento." /></div><div><h3 className="mb-3 font-bold">Últimos resultados</h3><MatchList games={summary.ultimos_resultados} empty="Nenhum resultado registrado ainda." /></div></div>
    </>}
  </section>
}

export function PublicCalendar() {
  const [filters, setFilters] = useState({ campeonato: '', esporte: '', time: '', status: '', inicio: '', fim: '' })
  const [options, setOptions] = useState<Option[][]>([[], [], []])
  const [games, setGames] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [optionsError, setOptionsError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const campeonato = new URLSearchParams(window.location.search).get('campeonato') || ''
    if (campeonato) setFilters(current => ({ ...current, campeonato }))
  }, [])
  useEffect(() => {
    let active = true
    setOptionsError('')
    Promise.all(['campeonatos', 'esportes', 'times'].map(path => request<Option[]>(path))).then(data => { if (active) setOptions(data) }).catch(err => { if (active) setOptionsError(err.message) })
    return () => { active = false }
  }, [attempt])
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value))
    request<Match[]>(`jogos?${params}`).then(data => { if (active) setGames(data) }).catch(err => { if (active) setError(err.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters, attempt])
  const change = (key: keyof typeof filters, value: string) => setFilters(current => ({ ...current, [key]: value }))
  return <><Header /><main className="section-wrap min-h-[70vh] py-10 sm:py-14">
    <div className="organizer-panel mb-8 rounded-2xl bg-[#19382b] p-6 text-white sm:p-9"><CalendarDays className="mb-3 size-8 text-[#d7f36a]" /><h1 className="font-display text-3xl font-bold">Calendário público</h1><p className="mt-3 text-sm">Acompanhe datas, horários, locais e resultados das partidas.</p></div>
    <div className="mb-6 grid gap-4 rounded-2xl border border-[#e5e7dd] bg-white p-6 sm:grid-cols-3">
      {(['campeonato', 'esporte', 'time'] as const).map((key, index) => <label key={key} className="text-sm font-semibold">{['Campeonato', 'Esporte', 'Time'][index]}<select className="arena-input mt-2 w-full" value={filters[key]} onChange={event => change(key, event.target.value)}><option value="">Todos</option>{options[index].map(option => <option key={option[`id_${key}`]} value={option[`id_${key}`]}>{option.nome}</option>)}</select></label>)}
      <label className="text-sm font-semibold">Status<select className="arena-input mt-2 w-full" value={filters.status} onChange={event => change('status', event.target.value)}><option value="">Todos</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      {(['inicio', 'fim'] as const).map(key => <label key={key} className="text-sm font-semibold">{key === 'inicio' ? 'De' : 'Até'}<input type="date" className="arena-input mt-2 w-full" value={filters[key]} onChange={event => change(key, event.target.value)} /></label>)}
      <button className="arena-secondary w-fit" onClick={() => setFilters({ campeonato: '', esporte: '', time: '', status: '', inicio: '', fim: '' })}>Limpar filtros</button>
    </div>
    {optionsError && <p role="alert" className="mb-4 text-sm text-red-800">Não foi possível carregar os filtros: {optionsError}<button className="arena-secondary ml-3" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></p>}
    {loading ? <p role="status">Carregando partidas...</p> : error ? <div role="alert" className="text-red-800">{error}<button className="arena-secondary mt-3" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div> : <><p className="mb-4 text-sm text-[#747b70]">{games.length} partida(s) encontrada(s) · horários locais das partidas</p><MatchList games={games} /></>}
  </main><Footer /></>
}
