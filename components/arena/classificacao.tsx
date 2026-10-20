'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Header, Footer } from './arena-home'
import { request } from './api'

type Championship = { id_campeonato: number; nome: string }
type Standing = { posicao: number; id_time: number; time: string; pj: number; v: number; e: number; d: number; gp: number; gs: number; sg: number; pts: number }
const columns = ['Posição', 'Time', 'PJ', 'V', 'E', 'D', 'GP', 'GS', 'SG', 'PTS']

export function PublicStandings() {
  const [championships, setChampionships] = useState<Championship[]>([])
  const [id, setId] = useState('')
  const [rows, setRows] = useState<Standing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [listError, setListError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setId(new URLSearchParams(window.location.search).get('campeonato') || '')
  }, [])

  useEffect(() => {
    let active = true
    setListError('')
    request<Championship[]>('campeonatos').then(data => {
      if (active) setChampionships(data)
    }).catch(err => { if (active) setListError(err.message) })
    return () => { active = false }
  }, [attempt])

  useEffect(() => {
    let active = true
    setRows([]); setError('')
    if (!id) { setLoading(false); return }
    setLoading(true)
    request<Standing[]>(`campeonatos/${encodeURIComponent(id)}/classificacao`).then(data => {
      if (active) setRows(data)
    }).catch(err => { if (active) setError(err.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, attempt])

  return <><Header /><main className="section-wrap min-h-[70vh] py-10 sm:py-14">
    <div className="organizer-panel relative mb-8 overflow-hidden rounded-2xl bg-[#19382b] p-6 text-white sm:p-9">
      <h1 className="font-display text-3xl font-bold">Classificação</h1>
      <p className="mt-3 text-sm">Acompanhe a posição e o desempenho dos times do campeonato.</p>
    </div>
    <label className="block max-w-lg text-sm font-semibold">Campeonato
      <select className="arena-input mt-2 w-full" value={id} onChange={event => {
        setId(event.target.value)
        window.history.replaceState(null, '', event.target.value ? `/classificacao?campeonato=${event.target.value}` : '/classificacao')
      }}>
        <option value="">Selecione um campeonato</option>
        {id && !championships.some(item => String(item.id_campeonato) === id) && <option value={id}>Campeonato selecionado</option>}
        {championships.map(item => <option key={item.id_campeonato} value={item.id_campeonato}>{item.nome}</option>)}
      </select>
    </label>
    {id && <nav aria-label="Navegação do campeonato" className="my-5 flex flex-wrap gap-3">
      <Link className="arena-secondary" href={`/campeonatos/${encodeURIComponent(id)}`}>Resumo</Link>
      <Link className="arena-secondary" href={`/jogos?campeonato=${encodeURIComponent(id)}`}>Calendário</Link>
      <Link className="arena-secondary" href={`/campeonatos/${encodeURIComponent(id)}#times-participantes`}>Times participantes</Link>
    </nav>}
    {(error || listError) && <div role="alert" className="my-5 text-sm text-red-800">{error || listError}<button className="arena-secondary mt-3" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div>}
    {loading ? <p role="status" className="mt-6">Carregando classificação...</p> : !id ? <p className="mt-6 text-sm text-[#747b70]">Selecione um campeonato para consultar a classificação.</p> : !error && (rows.length ? <section className="rounded-2xl border border-[#e5e7dd] bg-white p-5">
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <caption className="mb-4 text-left font-bold">{championships.find(item => String(item.id_campeonato) === id)?.nome || 'Classificação do campeonato'}</caption>
        <thead><tr>{columns.map(column => <th key={column} scope="col" className="whitespace-nowrap border-b border-[#e5e7dd] p-3">{column}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.id_time} className={Number(row.posicao) === 1 ? 'bg-[#eef1e5]' : ''}>
          <td className="p-3">{row.posicao}</td><th scope="row" className="p-3"><Link className="whitespace-nowrap underline" href={`/times/${row.id_time}`}>{row.time}</Link></th>
          {(['pj', 'v', 'e', 'd', 'gp', 'gs', 'sg', 'pts'] as const).map(key => <td key={key} className={`p-3 ${key === 'pts' ? 'font-bold' : ''}`}>{row[key]}</td>)}
        </tr>)}</tbody>
      </table></div>
      <p className="mt-4 text-xs leading-5 text-[#747b70]">PJ: partidas jogadas · V: vitórias · E: empates · D: derrotas · GP: gols/pontos a favor · GS: gols/pontos contra · SG: saldo · PTS: pontos.</p>
    </section> : <p className="mt-6 text-sm text-[#747b70]">Classificação indisponível. O campeonato precisa de times inscritos e regras de pontuação configuradas.</p>)}
  </main><Footer /></>
}
