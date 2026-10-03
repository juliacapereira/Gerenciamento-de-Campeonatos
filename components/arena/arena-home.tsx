'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  MapPin,
  Menu,
  Search,
  Shield,
  Trophy,
  Users,
  X,
} from 'lucide-react'

type HomeChampionship = { id_campeonato: number; nome: string; esporte: string; data_inicial: string; data_fim: string; status: string }
type HomeTeam = { id_time: number; nome: string; nome_abreviado?: string; esporte: string; cidade?: string }
const statusLabels: Record<string, string> = { PLANEJADO: 'Planejado', INSCRICOES: 'Inscrições abertas', EM_ANDAMENTO: 'Em andamento', ENCERRADO: 'Encerrado' }
function useHomeRecords<T>(kind: string) {
  const [records, setRecords] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(false)
    fetch(`/api/${kind}`, { cache: 'no-store', signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('API indisponível'); return response.json() })
      .then(data => { setRecords(data); setLoading(false) })
      .catch(() => { if (!controller.signal.aborted) { setError(true); setLoading(false) } })
    return () => controller.abort()
  }, [kind])
  return { records, loading, error }
}

const matches = [
  { day: 'HOJE', date: '24 MAI', time: '19:30', home: 'Atlético Central', away: 'União FC', homeMark: 'AC', awayMark: 'UF', place: 'Estádio Municipal', tournament: 'Copa Regional 2026' },
  { day: 'HOJE', date: '24 MAI', time: '20:00', home: 'Vila Nova', away: 'Real Independente', homeMark: 'VN', awayMark: 'RI', place: 'Campo do Parque', tournament: 'Copa Regional 2026' },
  { day: 'AMANHÃ', date: '25 MAI', time: '18:45', home: 'Nacional FC', away: 'Associação Primavera', homeMark: 'NF', awayMark: 'AP', place: 'Arena Norte', tournament: 'Copa Regional 2026' },
  { day: 'DOM, 26 MAI', date: '26 MAI', time: '16:00', home: 'Esporte Clube Norte', away: 'Juventus Municipal', homeMark: 'EN', awayMark: 'JM', place: 'Campo do Norte', tournament: 'Copa Regional 2026' },
]

const results = [
  { home: 'Atlético Central', away: 'União FC', homeMark: 'AC', awayMark: 'UF', score: '3 — 1', date: '22 mai', tournament: 'Copa Regional' },
  { home: 'Vila Nova', away: 'Nacional FC', homeMark: 'VN', awayMark: 'NF', score: '2 — 2', date: '21 mai', tournament: 'Copa Regional' },
  { home: 'Real Independente', away: 'Associação Primavera', homeMark: 'RI', awayMark: 'AP', score: '1 — 0', date: '20 mai', tournament: 'Copa Regional' },
]

const standings = [
  { pos: 1, team: 'Atlético Central', mark: 'AC', pj: 6, v: 5, e: 1, d: 0, sg: '+12', pts: 16 },
  { pos: 2, team: 'União FC', mark: 'UF', pj: 6, v: 4, e: 1, d: 1, sg: '+8', pts: 13 },
  { pos: 3, team: 'Vila Nova', mark: 'VN', pj: 6, v: 3, e: 2, d: 1, sg: '+5', pts: 11 },
  { pos: 4, team: 'Real Independente', mark: 'RI', pj: 6, v: 3, e: 1, d: 2, sg: '+3', pts: 10 },
  { pos: 5, team: 'Nacional FC', mark: 'NF', pj: 6, v: 2, e: 2, d: 2, sg: '+1', pts: 8 },
]

const scorers = [
  { name: 'Lucas Mendes', team: 'Atlético Central', goals: 9, initials: 'LM', color: 'lime' },
  { name: 'Rafael Silva', team: 'União FC', goals: 7, initials: 'RS', color: 'peach' },
  { name: 'Pedro Santos', team: 'Vila Nova', goals: 6, initials: 'PS', color: 'blue' },
]


function SectionHeading({ eyebrow, title, href, linkLabel = 'Ver todos' }: { eyebrow: string; title: string; href: string; linkLabel?: string }) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#858b80]">{eyebrow}</p>
        <h2 className="font-display text-3xl font-bold tracking-[-.04em] text-[#172c23] sm:text-[2.35rem]">{title}</h2>
      </div>
      <Link href={href} className="group mb-1 hidden items-center gap-2 text-sm font-semibold text-[#34473c] transition hover:text-[#5b7425] sm:flex">
        {linkLabel}<ArrowRight className="size-4 transition group-hover:translate-x-1" />
      </Link>
    </div>
  )
}

function TeamMark({ mark, className = '' }: { mark: string; className?: string }) {
  return <div aria-label={`Escudo ${mark}`} className={`team-mark ${className}`}><Shield aria-hidden="true" className="absolute size-[78%] stroke-[1.1] opacity-25" /><span className="relative text-[10px] font-black tracking-tight">{mark}</span></div>
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const links = [['Início', '/'], ['Campeonatos', '/campeonatos'], ['Jogos', '/jogos'], ['Classificação', '/classificacao'], ['Times', '/times'], ['Jogadores', '/jogadores']]
  return (
    <header className="sticky top-0 z-50 border-b border-[#e9e9e1] bg-[#fbfbf8]/95 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Arena Local — início">
          <span className="flex size-9 items-center justify-center rounded-[11px] bg-[#18372b] text-[#d7f36a]"><Trophy className="size-[18px]" strokeWidth={2.2} /></span>
          <span className="text-[17px] font-extrabold tracking-[-.06em] text-[#193328]">arena<span className="text-[#829c38]">local</span></span>
        </Link>
        <nav aria-label="Navegação principal" className="hidden items-center gap-7 lg:flex">
          {links.map(([label, href], i) => <Link key={label} href={href} className={`text-[13px] font-semibold transition hover:text-[#688128] ${i === 0 ? 'text-[#1e3b2d]' : 'text-[#72786e]'}`}>{label}</Link>)}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/#buscar" aria-label="Pesquisar" className="flex size-10 items-center justify-center rounded-full text-[#4f5c51] transition hover:bg-[#f0f0e9]"><Search className="size-[18px]" /></Link>
          <Link href="/campeonatos/novo" className="rounded-lg bg-[#1b392c] px-4 py-[11px] text-[12px] font-bold text-white transition hover:bg-[#2c523d]">Criar campeonato <ArrowUpRight className="ml-1 inline size-3.5" /></Link>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} className="flex size-10 items-center justify-center rounded-lg text-[#263b2f] hover:bg-[#f0f0e9] lg:hidden">
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {menuOpen && <nav aria-label="Navegação móvel" className="border-t border-[#e9e9e1] bg-[#fbfbf8] px-5 py-4 lg:hidden">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-1">
          {links.map(([label, href]) => <Link onClick={() => setMenuOpen(false)} key={label} href={href} className="rounded-lg px-3 py-3 text-sm font-semibold text-[#3e4c40] hover:bg-[#f0f0e9]">{label}</Link>)}
          <Link onClick={() => setMenuOpen(false)} href="/campeonatos/novo" className="mt-2 rounded-lg bg-[#1b392c] px-4 py-3 text-center text-sm font-bold text-white">Criar campeonato</Link>
        </div>
      </nav>}
    </header>
  )
}

function HeroSection() {
  return <section className="mx-auto max-w-[1240px] px-4 pt-5 sm:px-6 lg:px-8 lg:pt-7">
    <div className="hero-surface relative isolate min-h-[470px] overflow-hidden rounded-[20px] bg-[#19362b] sm:min-h-[490px] lg:min-h-[480px]">
      <Image src="/images/arena-hero.png" alt="Campo de futebol de uma competição local ao entardecer" fill priority sizes="(max-width: 768px) 100vw, 1240px" className="-z-20 object-cover object-[62%_50%]" />
      <div className="hero-overlay absolute inset-0 -z-10" />
      <div className="relative z-10 flex min-h-[470px] flex-col justify-center px-6 py-12 sm:min-h-[490px] sm:px-10 lg:min-h-[480px] lg:px-[68px]">
        <div className="mb-6 flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.17em] text-[#def081] backdrop-blur-sm"><span className="size-1.5 rounded-full bg-[#d7f36a]" /> O esporte acontece aqui</div>
        <h1 className="max-w-[610px] font-display text-[2.8rem] font-bold leading-[.98] tracking-[-.055em] text-white sm:text-6xl lg:text-[4.15rem]">Seu campeonato.<br />Sua torcida.<br /><span className="text-[#d7f36a]">Tudo em um só lugar.</span></h1>
        <p className="mt-5 max-w-[440px] text-sm leading-6 text-white/75 sm:text-[15px]">Acompanhe campeonatos amadores, partidas, classificações, times e jogadores de forma simples e organizada.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/campeonatos" className="inline-flex items-center gap-2 rounded-lg bg-[#d7f36a] px-5 py-3.5 text-[13px] font-extrabold text-[#1b3428] transition hover:bg-[#e6ff8c]">Ver campeonatos <ArrowRight className="size-4" /></Link>
          <Link href="/jogos" className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-5 py-3.5 text-[13px] font-bold text-white backdrop-blur-sm transition hover:bg-white/20"><CalendarDays className="size-4" /> Próximos jogos</Link>
        </div>
        <div className="mt-9 flex items-center gap-5 text-[11px] font-medium text-white/70 sm:mt-10">
          <span className="flex items-center gap-2"><Users className="size-4 text-[#d7f36a]" /> 24 times ativos</span><span className="h-4 w-px bg-white/25" /><span className="flex items-center gap-2"><Trophy className="size-4 text-[#d7f36a]" /> 3 competições</span>
        </div>
      </div>
      <div className="absolute bottom-6 right-6 hidden w-[220px] rounded-xl border border-white/15 bg-[#173529]/75 p-4 text-white shadow-xl backdrop-blur-md sm:block lg:bottom-8 lg:right-8">
        <div className="flex items-center justify-between"><span className="text-[9px] font-bold uppercase tracking-[.16em] text-white/65">Jogo em destaque</span><span className="flex items-center gap-1 rounded-full bg-[#d7f36a]/15 px-2 py-1 text-[9px] font-bold text-[#d7f36a]"><span className="size-1 rounded-full bg-[#d7f36a]" /> AO VIVO</span></div>
        <div className="mt-4 flex items-center justify-between"><div className="flex flex-col items-center gap-1.5"><TeamMark mark="AC" className="size-9 border-white/20 bg-white/10 text-white"/><span className="text-[10px]">Atlético</span></div><span className="font-display text-2xl font-bold">2 <span className="text-white/35">:</span> 1</span><div className="flex flex-col items-center gap-1.5"><TeamMark mark="UF" className="size-9 border-white/20 bg-white/10 text-white"/><span className="text-[10px]">União FC</span></div></div>
        <div className="mt-3 border-t border-white/15 pt-3 text-center text-[9px] text-white/55">Copa Regional 2026 <span className="px-1">·</span> 2º tempo</div>
      </div>
      <div className="absolute bottom-5 right-5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[.15em] text-white/55 sm:hidden"><span className="size-1.5 rounded-full bg-[#d7f36a]"/> Acompanhe ao vivo</div>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1 text-[11px] text-[#747b70]">
      <span className="flex items-center gap-2"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[#8ca742] opacity-50"/><span className="relative inline-flex size-2 rounded-full bg-[#8ca742]"/></span> A temporada está acontecendo</span>
      <Link href="/campeonatos" className="group inline-flex items-center gap-1 font-bold text-[#364a3b]">Explore as competições <ArrowDownRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:translate-y-0.5" /></Link>
    </div>
  </section>
}

function ChampionshipCard({ item }: { item: HomeChampionship }) {
  const date = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')
  return <article className="group overflow-hidden rounded-xl border border-[#e8e8df] bg-white transition duration-200 hover:-translate-y-1 hover:border-[#d2d8bf] hover:shadow-[0_12px_30px_-18px_rgba(31,51,36,.25)]">
    <div className="champ-banner champ-green flex h-[116px] items-center justify-between px-5"><div className="flex flex-col gap-2"><span className="w-fit rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.1em] text-white">{item.esporte}</span><span className="text-[10px] font-semibold text-white/75">TEMPORADA {item.data_inicial.slice(0, 4)}</span></div><div className="champ-emblem">{item.nome.split(' ').map(word => word[0]).join('').slice(0, 3).toUpperCase()}</div></div>
    <div className="p-5"><h3 className="font-display break-words text-[19px] font-bold leading-tight tracking-[-.035em] text-[#20372b]"><Link href={`/campeonatos/${item.id_campeonato}`}>{item.nome}</Link></h3><span className={`status-dot mt-3 ${item.status === 'INSCRICOES' ? 'status-open' : ''}`}>{statusLabels[item.status]}</span><p className="mt-4 flex items-center gap-1.5 text-[11px] text-[#81867d]"><CalendarDays className="size-3.5 shrink-0" />{date(item.data_inicial)} — {date(item.data_fim)}</p><Link href={`/campeonatos/${item.id_campeonato}`} className="mt-5 flex items-center justify-between border-t border-[#eee] pt-4 text-[12px] font-bold text-[#37493b]">Ver campeonato<ArrowRight className="size-4" /></Link></div>
  </article>
}

function ChampionshipsSection() {
  const { records, loading, error } = useHomeRecords<HomeChampionship>('campeonatos')
  return <section className="section-wrap pt-20 sm:pt-24"><SectionHeading eyebrow="Escolha sua torcida" title="Campeonatos em destaque" href="/campeonatos" linkLabel="Todos os campeonatos" />
    {loading ? <p role="status" className="arena-empty">Carregando campeonatos...</p> : records.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{records.slice(0, 3).map(item => <ChampionshipCard key={item.id_campeonato} item={item} />)}</div> : <div className="arena-empty"><p>{error ? 'Não foi possível carregar os campeonatos.' : 'A próxima competição da comunidade começa com você.'}</p><Link className="arena-primary mt-4" href={error ? '/campeonatos' : '/campeonatos/novo'}>{error ? 'Abrir campeonatos' : 'Criar campeonato'}<ArrowRight className="size-4" /></Link></div>}
  </section>
}

function MatchCard({ match, index }: { match: (typeof matches)[number]; index: number }) {
  return <article className={`match-card ${index === 0 ? 'match-feature' : ''}`}>
    <div className="match-time"><span className={index === 0 ? 'text-[#b3d653]' : 'text-[#8b9087]'}>{match.day}</span><strong>{match.time}</strong><span>{match.date}</span></div>
    <div className="match-teams">
      <div className="match-side"><TeamMark mark={match.homeMark} className={index === 0 ? 'match-mark-light' : ''}/><span>{match.home}</span></div>
      <span className="match-vs">VS</span>
      <div className="match-side match-away"><TeamMark mark={match.awayMark} className={index === 0 ? 'match-mark-light' : ''}/><span>{match.away}</span></div>
    </div>
    <div className="match-meta"><span><MapPin className="size-3.5" />{match.place}</span><span><Trophy className="size-3.5" />{match.tournament}</span></div>
    <Link href="/jogos" aria-label={`Detalhes de ${match.home} contra ${match.away}`} className={`match-arrow ${index === 0 ? 'match-arrow-light' : ''}`}><ArrowUpRight className="size-4" /></Link>
  </article>
}

function MatchesSection() {
  return <section className="bg-[#f0f1e9] py-16 sm:py-[72px]">
    <div className="section-wrap">
      <SectionHeading eyebrow="A bola vai rolar" title="Próximos jogos" href="/jogos" linkLabel="Calendário completo" />
      <div className="flex flex-col gap-3">{matches.map((match, index) => <MatchCard key={`${match.home}-${match.away}`} match={match} index={index} />)}</div>
      <div className="mt-6 flex justify-center sm:hidden"><Link href="/jogos" className="inline-flex items-center gap-2 rounded-lg border border-[#d7dbce] px-4 py-3 text-[12px] font-bold text-[#34483a]">Ver calendário completo <ArrowRight className="size-4" /></Link></div>
    </div>
  </section>
}

function ResultsSection() {
  return <section className="section-wrap pt-16 sm:pt-20">
    <SectionHeading eyebrow="O que já aconteceu" title="Últimos resultados" href="/jogos" />
    <div className="grid gap-3 md:grid-cols-3">{results.map((result) => <article key={`${result.home}-${result.away}`} className="result-card">
      <div className="mb-4 flex items-center justify-between text-[9px] font-bold uppercase tracking-[.14em] text-[#8b9086]"><span>{result.tournament}</span><span>{result.date}</span></div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center"><TeamMark mark={result.homeMark}/><span className="w-full truncate text-[11px] font-semibold text-[#566054]">{result.home}</span></div>
        <div className="whitespace-nowrap rounded-md bg-[#f3f4ed] px-3 py-2 font-display text-[21px] font-bold tracking-[-.04em] text-[#23392c]">{result.score}</div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center"><TeamMark mark={result.awayMark}/><span className="w-full truncate text-[11px] font-semibold text-[#566054]">{result.away}</span></div>
      </div>
    </article>)}</div>
  </section>
}

function StandingsPreview() {
  return <section className="rounded-xl border border-[#e7e8df] bg-white p-5 sm:p-6">
    <div className="mb-5 flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#8c9186]">Copa Regional 2026</p><h3 className="mt-1 font-display text-xl font-bold tracking-[-.04em] text-[#20372b]">Classificação</h3></div><Link href="/classificacao" aria-label="Ver classificação completa" className="flex size-9 items-center justify-center rounded-full bg-[#f1f2eb] text-[#4e6048] transition hover:bg-[#e7ebda]"><ArrowUpRight className="size-4" /></Link></div>
    <div className="overflow-x-auto">
      <table className="standings-table w-full min-w-[490px] text-left">
        <thead><tr><th>POS</th><th>TIME</th><th>PJ</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>PTS</th></tr></thead>
        <tbody>{standings.map((row) => <tr key={row.pos} className={row.pos === 1 ? 'leader-row' : ''}><td><span className={`rank-num ${row.pos === 1 ? 'rank-first' : ''}`}>{String(row.pos).padStart(2, '0')}</span></td><td><Link href="/times" className="flex items-center gap-2.5 font-semibold text-[#37463a] hover:text-[#71892e]"><TeamMark mark={row.mark} className="size-7 text-[8px]"/><span className="max-w-[130px] truncate">{row.team}</span></Link></td><td>{row.pj}</td><td>{row.v}</td><td>{row.e}</td><td>{row.d}</td><td>{row.sg}</td><td className="font-extrabold text-[#263e2e]">{row.pts}</td></tr>)}</tbody>
      </table>
    </div>
    <Link href="/classificacao" className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-[#e7e8df] py-3 text-[11px] font-bold text-[#455642] transition hover:bg-[#f6f7f2]">Ver classificação completa <ArrowRight className="size-3.5" /></Link>
  </section>
}

function PlayerRanking() {
  return <section className="rounded-xl border border-[#e7e8df] bg-white p-5 sm:p-6">
    <div className="mb-5 flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#8c9186]">Quem balança a rede</p><h3 className="mt-1 font-display text-xl font-bold tracking-[-.04em] text-[#20372b]">Artilharia</h3></div><Link href="/jogadores" aria-label="Ver todos os jogadores" className="flex size-9 items-center justify-center rounded-full bg-[#f1f2eb] text-[#4e6048] transition hover:bg-[#e7ebda]"><ArrowUpRight className="size-4" /></Link></div>
    <div className="flex flex-col">{scorers.map((player, index) => <div key={player.name} className="flex items-center gap-3 border-t border-[#eff0e9] py-3 first:border-0 first:pt-0 last:pb-0">
      <span className={`w-5 text-center font-display text-lg font-bold ${index === 0 ? 'text-[#829d38]' : 'text-[#a7aaa1]'}`}>{index + 1}<sup className="text-[9px]">º</sup></span>
      <div className={`player-avatar avatar-${player.color}`}>{player.initials}</div>
      <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-bold text-[#344438]">{player.name}</p><p className="mt-0.5 truncate text-[10px] text-[#858a80]">{player.team}</p></div>
      <div className="text-right"><span className="font-display text-[21px] font-bold text-[#233b2c]">{player.goals}</span><span className="ml-1 text-[9px] text-[#898e84]">gols</span></div>
    </div>)}</div>
  </section>
}

function TeamHighlights() {
  const { records, loading, error } = useHomeRecords<HomeTeam>('times')
  return <section className="rounded-xl border border-[#e7e8df] bg-white p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#8c9186]">Quem entra em campo</p><h3 className="mt-1 font-display text-xl font-bold tracking-[-.04em] text-[#20372b]">Times da comunidade</h3></div><Link href="/times" aria-label="Ver todos os times" className="flex size-9 items-center justify-center rounded-full bg-[#f1f2eb] text-[#4e6048]"><ArrowUpRight className="size-4" /></Link></div>
    {loading ? <p role="status" className="text-xs text-[#858a80]">Carregando times...</p> : records.length ? <div>{records.slice(0, 3).map(team => <Link href={`/times/${team.id_time}`} key={team.id_time} className="flex items-center gap-3 border-t border-[#eff0e9] py-3 first:border-0 first:pt-0 last:pb-0"><TeamMark mark={(team.nome_abreviado || team.nome.split(' ').map(word => word[0]).join('')).slice(0, 3).toUpperCase()} /><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-bold text-[#344438]">{team.nome}</p><p className="mt-0.5 truncate text-[10px] text-[#858a80]">{team.esporte}{team.cidade ? ` · ${team.cidade}` : ''}</p></div><ArrowUpRight className="size-4 shrink-0 text-[#829c38]" /></Link>)}</div> : <p className="text-xs leading-6 text-[#858a80]">{error ? 'Não foi possível carregar os times.' : 'Cadastre o primeiro time da comunidade.'} <Link className="font-bold underline" href="/times">Abrir times</Link></p>}
  </section>
}

function HighlightsSection() {
  return <section className="section-wrap pt-16 sm:pt-20"><SectionHeading eyebrow="Números da competição" title="Destaques do campeonato" href="/jogadores" linkLabel="Ver estatísticas" /><div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]"><StandingsPreview/><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1"><PlayerRanking/><TeamHighlights/></div></div></section>
}

const searchEntries = [
  { type: 'JOGADORES', name: 'Lucas Mendes', meta: 'Atlético Central · 9 gols', href: '/jogadores' },
  { type: 'JOGADORES', name: 'Rafael Silva', meta: 'União FC · 7 gols', href: '/jogadores' },
  { type: 'JOGADORES', name: 'Pedro Santos', meta: 'Vila Nova · 6 gols', href: '/jogadores' },
]

function SearchSection() {
  const { records } = useHomeRecords<HomeTeam>('times')
  const entries = useMemo(() => [...records.map(team => ({ type: 'TIMES', name: team.nome, meta: `${team.esporte}${team.cidade ? ` · ${team.cidade}` : ''}`, href: `/times/${team.id_time}` })), ...searchEntries], [records])
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const filtered = useMemo(() => query.trim() ? entries.filter((entry) => `${entry.name} ${entry.meta}`.toLowerCase().includes(query.toLowerCase())) : entries, [query, entries])
  const groups = ['TIMES', 'JOGADORES']
  return <section id="buscar" className="section-wrap pt-16 sm:pt-20">
    <div className="search-panel relative overflow-visible rounded-2xl bg-[#e9eddf] px-5 py-9 sm:px-10 sm:py-11">
      <div className="mx-auto max-w-[660px] text-center"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#778664]">Tudo começa por aqui</p><h2 className="font-display text-[28px] font-bold tracking-[-.045em] text-[#1c3529] sm:text-[34px]">Encontre seu time ou jogador</h2><p className="mt-2 text-[12px] text-[#6e7868]">Pesquise entre as equipes e craques da competição.</p>
        <div className="relative mt-6 text-left">
          <label htmlFor="arena-search" className="sr-only">Pesquisar times ou jogadores</label><div className={`flex items-center gap-3 rounded-xl border bg-white px-4 shadow-[0_7px_22px_-15px_rgba(23,47,31,.28)] transition ${focused ? 'border-[#829b43] ring-4 ring-[#829b43]/10' : 'border-[#e3e6da]'}`}><Search className="size-[18px] shrink-0 text-[#73816b]"/><input id="arena-search" value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 140)} onKeyDown={(event) => { if (event.key === 'Escape') { setFocused(false); (event.currentTarget as HTMLInputElement).blur() } }} placeholder="Pesquisar times ou jogadores..." autoComplete="off" className="h-[54px] min-w-0 flex-1 bg-transparent text-[13px] text-[#263b2f] outline-none placeholder:text-[#a1a59c]"/><span className="hidden rounded-md bg-[#f1f2ec] px-2 py-1 text-[9px] font-semibold text-[#7d8478] sm:block">BUSCA RÁPIDA</span></div>
          {focused && <div role="listbox" aria-label="Sugestões de busca" className="absolute inset-x-0 top-[calc(100%+8px)] z-20 max-h-[320px] overflow-y-auto rounded-xl border border-[#e6e8df] bg-white p-2 shadow-[0_20px_45px_-24px_rgba(20,42,30,.35)]">
            {filtered.length ? groups.map((group) => { const rows = filtered.filter((entry) => entry.type === group); return rows.length ? <div key={group}><p className="px-3 pb-1 pt-2 text-[9px] font-bold tracking-[.15em] text-[#979b91]">{group}</p>{rows.map((entry) => <Link key={entry.name} role="option" href={entry.href} onMouseDown={(event) => event.preventDefault()} onClick={() => { setQuery(entry.name); setFocused(false) }} className="flex items-center justify-between rounded-lg px-3 py-2.5 transition hover:bg-[#f4f5ee]"><span className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-lg bg-[#eef1e5] text-[#667b37]">{group === 'TIMES' ? <Shield className="size-4"/> : <Users className="size-4"/>}</span><span><span className="block text-[12px] font-bold text-[#374638]">{entry.name}</span><span className="mt-0.5 block text-[10px] text-[#858a80]">{entry.meta}</span></span></span><ArrowUpRight className="size-4 text-[#a0a597]"/></Link>)}</div> : null }) : <p className="px-3 py-5 text-center text-xs text-[#858a80]">Nenhum resultado por enquanto. Tente outro nome.</p>}
          </div>}
        </div>
      </div>
    </div>
  </section>
}

function OrganizerCTA() {
  return <section className="section-wrap pb-16 pt-16 sm:pb-20 sm:pt-20">
    <div className="organizer-panel relative overflow-hidden rounded-2xl bg-[#19382b] px-6 py-9 sm:px-10 sm:py-10 lg:px-12">
      <div className="relative z-10 max-w-[650px]"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.16em] text-[#d7f36a]"><Trophy className="size-3.5"/> Para quem faz acontecer</span><h2 className="mt-4 max-w-[550px] font-display text-[29px] font-bold leading-[1.05] tracking-[-.045em] text-white sm:text-[37px]">Organize seu campeonato de forma simples</h2><p className="mt-3 max-w-[520px] text-[13px] leading-6 text-white/65">Cadastre equipes, jogadores, partidas, resultados e mantenha todos acompanhando a competição em um só lugar.</p><Link href="/campeonatos/novo" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#d7f36a] px-5 py-3.5 text-[12px] font-extrabold text-[#1b3428] transition hover:bg-[#e6ff8c]">Criar meu campeonato <ArrowRight className="size-4"/></Link></div>
      <div aria-hidden="true" className="cta-decoration"><div className="cta-ring cta-ring-one"/><div className="cta-ring cta-ring-two"/><div className="cta-ring cta-ring-three"/><div className="cta-center"><Trophy className="size-10 text-[#d7f36a]"/></div></div>
    </div>
  </section>
}

export function Footer() {
  return <footer className="border-t border-[#e6e7df] bg-[#f6f6f1]">
    <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-10 sm:grid-cols-[1.4fr_.75fr_.8fr] sm:px-8 sm:py-12">
      <div><Link href="/" className="inline-flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-[10px] bg-[#18372b] text-[#d7f36a]"><Trophy className="size-4"/></span><span className="text-[16px] font-extrabold tracking-[-.06em] text-[#193328]">arena<span className="text-[#829c38]">local</span></span></Link><p className="mt-3 max-w-[300px] text-[11px] leading-5 text-[#7d8278]">O ponto de encontro de quem vive o esporte na sua comunidade.</p></div>
      <div><h3 className="mb-3 text-[10px] font-bold uppercase tracking-[.15em] text-[#556050]">Plataforma</h3><div className="flex flex-col gap-2.5">{[['Campeonatos','/campeonatos'],['Jogos','/jogos'],['Classificação','/classificacao'],['Times','/times']].map(([label,href])=><Link key={label} href={href} className="w-fit text-[11px] text-[#7d8278] transition hover:text-[#314834]">{label}</Link>)}</div></div>
      <div><h3 className="mb-3 text-[10px] font-bold uppercase tracking-[.15em] text-[#556050]">Informações</h3><div className="flex flex-col gap-2.5">{[['Sobre','/#sobre'],['Contato','mailto:contato@arenalocal.com.br'],['Termos de uso','/termos'],['Privacidade','/privacidade']].map(([label,href])=><Link key={label} href={href} className="w-fit text-[11px] text-[#7d8278] transition hover:text-[#314834]">{label}</Link>)}</div></div>
    </div>
    <div className="border-t border-[#e6e7df]"><div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-5 py-4 text-[10px] text-[#93968e] sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>© 2026 Arena Local — Todos os direitos reservados.</span><span className="flex items-center gap-1"><Check className="size-3 text-[#839a44]"/> Feito para o esporte da comunidade</span></div></div>
  </footer>
}

export default function ArenaHome() {
  return <div className="min-h-screen bg-[#fbfbf8] text-[#21372b]"><Header/><main><HeroSection/><ChampionshipsSection/><MatchesSection/><ResultsSection/><HighlightsSection/><SearchSection/><OrganizerCTA/></main><Footer/></div>
}

