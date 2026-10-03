'use client'

// US07 - Cadastro de jogadores. Mesmo visual das páginas de campeonatos e times
// (components/arena/management.tsx), em um arquivo separado para facilitar o merge.
import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, IdCard, Pencil, Plus, Search, Trash2, Users } from 'lucide-react'
import { Footer, Header } from './arena-home'
import { request } from './management'

type Player = { id_jogador: number; nome: string; documento: string; data_nascimento?: string | null; foto_url?: string | null }

// As páginas são públicas, então o documento (dado pessoal) só aparece por inteiro no formulário de edição.
const maskDocument = (value: string) => (value.length > 3 ? '•'.repeat(Math.min(value.length - 3, 8)) + value.slice(-3) : '•••')
const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()
const formatDate = (date?: string | null) => (date ? new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '')

function Shell({ children }: { children: ReactNode }) {
  return <><Header /><main className="section-wrap min-h-[70vh] py-10 sm:py-14">{children}</main><Footer /></>
}

function Banner({ title }: { title: string }) {
  return (
    <div className="organizer-panel relative mb-8 overflow-hidden rounded-2xl bg-[#19382b] p-6 text-white sm:p-9">
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-[#d7f36a]">Para quem faz acontecer</p>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">Quem joga é quem dá vida à competição. Cadastre os atletas da comunidade.</p>
        </div>
        <Users aria-hidden="true" className="hidden size-20 shrink-0 text-[#d7f36a]/70 sm:block" />
      </div>
    </div>
  )
}

function Avatar({ player, className = 'size-14' }: { player: Pick<Player, 'nome' | 'foto_url'>; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (player.foto_url && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={player.foto_url} alt={`Foto de ${player.nome}`} onError={() => setFailed(true)} className={`${className} shrink-0 rounded-full border border-[#e5e7dd] bg-[#f1f2eb] object-cover`} />
  }
  return <div aria-hidden="true" className={`${className} flex shrink-0 items-center justify-center rounded-full bg-[#eef1e5] text-sm font-extrabold text-[#5b7425]`}>{initials(player.nome) || '?'}</div>
}

function Field({ name, label, required = false, children }: { name: string; label: string; required?: boolean; children: ReactNode }) {
  return <div><label htmlFor={name} className="mb-2 block text-xs font-bold">{label}{required && <span className="text-[#829c38]"> *</span>}</label>{children}</div>
}

export function PlayerList() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  async function load() {
    setLoading(true); setError('')
    try { setPlayers(await request<Player[]>('jogadores')) }
    catch (error) { setError(error instanceof Error ? error.message : 'Erro ao carregar jogadores.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const filtered = players.filter(player => player.nome.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))

  return (
    <Shell>
      <Banner title="Jogadores" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Atletas da comunidade</h2>
          <p className="mt-1 text-xs text-[#7d8378]">{players.length} jogadores cadastrados</p>
        </div>
        <Link className="arena-primary" href="/jogadores/novo"><Plus className="size-4" />Cadastrar jogador</Link>
      </div>
      <div className="relative mb-7 max-w-xl">
        <Search className="absolute left-3 top-3.5 size-4 text-[#7d8378]" />
        <input aria-label="Pesquisar jogadores" className="arena-input pl-10!" placeholder="Pesquisar jogador..." value={query} onChange={event => setQuery(event.target.value)} />
      </div>
      {loading ? <p role="status" className="arena-empty">Carregando jogadores...</p>
        : error ? <div role="alert" className="arena-empty"><p>{error}</p><button className="arena-secondary mt-4" onClick={load}>Tentar novamente</button></div>
        : filtered.length === 0 ? (
          <div className="arena-empty">
            <Users className="mx-auto mb-4 size-9 text-[#829c38]" />
            <h3 className="font-display text-2xl font-bold">{players.length ? 'Nenhum resultado encontrado' : 'O time começa por quem joga'}</h3>
            <p className="mt-2 text-sm text-[#7d8378]">{players.length ? 'Experimente outro nome.' : 'Cadastre o primeiro jogador da comunidade.'}</p>
            {!players.length && <Link className="arena-primary mt-5" href="/jogadores/novo">Cadastrar jogador<ArrowRight className="size-4" /></Link>}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(player => (
              <article key={player.id_jogador} className="overflow-hidden rounded-xl border border-[#e5e7dd] bg-white p-5">
                <div className="flex items-center gap-4">
                  <Avatar player={player} />
                  <h3 className="font-display min-w-0 break-words text-xl font-bold"><Link className="hover:text-[#789339]" href={`/jogadores/${player.id_jogador}`}>{player.nome}</Link></h3>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e5e7dd] pt-4">
                  <Link className="inline-flex items-center gap-2 text-xs font-bold" href={`/jogadores/${player.id_jogador}`}>Ver jogador<ArrowRight className="size-4" /></Link>
                  <Link className="inline-flex items-center gap-1 text-xs text-[#68795c]" href={`/jogadores/${player.id_jogador}/editar`}><Pencil className="size-3.5" />Editar</Link>
                </div>
              </article>
            ))}
          </div>
        )}
    </Shell>
  )
}

export function PlayerForm({ id }: { id?: string }) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [savedId, setSavedId] = useState<string | number | undefined>(id)
  const [loading, setLoading] = useState(Boolean(id))
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const today = new Date().toLocaleDateString('en-CA')

  async function load() {
    if (!id) return
    setLoading(true); setLoadError('')
    try { setPlayer(await request<Player>(`jogadores/${id}`)) }
    catch (error) { setLoadError(error instanceof Error ? error.message : 'Erro ao carregar jogador.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const body = Object.fromEntries(new FormData(event.currentTarget))
    setError(''); setSaving(true)
    try {
      const result = await request<{ mensagem: string; id_jogador: number }>(id ? `jogadores/${id}` : 'jogadores', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      setSavedId(id || result.id_jogador); setSuccess(result.mensagem)
    } catch (error) { setError(error instanceof Error ? error.message : 'Erro ao salvar dados.') }
    finally { setSaving(false) }
  }

  return (
    <Shell>
      <Link className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-[#68795c]" href="/jogadores"><ArrowLeft className="size-4" />Voltar para jogadores</Link>
      <Banner title={id ? 'Editar jogador' : 'Cadastrar jogador'} />
      {success ? (
        <section className="arena-empty" role="status">
          <CheckCircle2 className="mx-auto mb-4 size-12 text-[#829c38]" />
          <h2 className="font-display text-3xl font-bold">{success}</h2>
          <p className="mt-3 text-sm text-[#747b70]">Tudo pronto! O cadastro já está disponível na listagem.</p>
          <Link className="arena-primary mt-6" href={`/jogadores/${savedId}`}>Abrir jogador<ArrowRight className="size-4" /></Link>
        </section>
      ) : loading ? <p role="status" className="arena-empty">Carregando formulário...</p>
        : id && !player ? <div className="arena-empty" role="alert"><p>{loadError || 'Cadastro não encontrado.'}</p><button className="arena-secondary mt-4" onClick={load}>Tentar novamente</button></div>
        : (
          <form key={id || 'novo'} onSubmit={submit} className="max-w-3xl rounded-2xl border border-[#e5e7dd] bg-white p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold">Identificação do jogador</h2>
            <p className="mb-7 mt-2 text-xs text-[#7d8378]">Preencha os campos abaixo. Os campos com * são obrigatórios.</p>
            <fieldset disabled={saving} className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field name="nome" label="Nome completo" required><input className="arena-input" id="nome" name="nome" defaultValue={player?.nome || ''} required minLength={2} maxLength={150} placeholder="Ex.: Carlos Eduardo da Silva" /></Field>
                <Field name="documento" label="Documento (RG ou CPF)" required><input className="arena-input" id="documento" name="documento" defaultValue={player?.documento || ''} required minLength={3} maxLength={30} placeholder="Ex.: 123.456.789-00" autoComplete="off" /></Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field name="data_nascimento" label="Data de nascimento"><input className="arena-input" type="date" id="data_nascimento" name="data_nascimento" defaultValue={player?.data_nascimento?.slice(0, 10) || ''} min="1900-01-01" max={today} /></Field>
                <Field name="foto_url" label="Link da foto"><input className="arena-input" type="url" id="foto_url" name="foto_url" defaultValue={player?.foto_url || ''} maxLength={500} placeholder="https://exemplo.com/foto.jpg" /></Field>
              </div>
              {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p>}
              <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-[#e5e7dd] pt-5">
                <Link className="arena-secondary" href={id ? `/jogadores/${id}` : '/jogadores'}>Cancelar</Link>
                <button className="arena-primary" type="submit" disabled={saving}>{saving ? 'Salvando...' : id ? 'Salvar alterações' : 'Cadastrar jogador'}<ArrowRight className="size-4" /></button>
              </div>
            </fieldset>
          </form>
        )}
    </Shell>
  )
}

export function PlayerDetail({ id }: { id: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleted, setDeleted] = useState(false)

  async function load() {
    setLoading(true); setError('')
    try { setPlayer(await request<Player>(`jogadores/${id}`)) }
    catch (error) { setError(error instanceof Error ? error.message : 'Erro ao carregar jogador.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function remove() {
    if (deleting) return
    setDeleting(true); setDeleteError('')
    try { await request(`jogadores/${id}`, { method: 'DELETE' }); dialog.current?.close(); setDeleted(true) }
    catch (error) { setDeleteError(error instanceof Error ? error.message : 'Não foi possível excluir.') }
    finally { setDeleting(false) }
  }

  return (
    <Shell>
      <Link className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-[#68795c]" href="/jogadores"><ArrowLeft className="size-4" />Voltar para jogadores</Link>
      {deleted ? (
        <section className="arena-empty" role="status">
          <CheckCircle2 className="mx-auto mb-4 size-12 text-[#829c38]" />
          <h1 className="font-display text-3xl font-bold">Jogador excluído com sucesso!</h1>
          <Link className="arena-primary mt-6" href="/jogadores">Voltar para jogadores<ArrowRight className="size-4" /></Link>
        </section>
      ) : loading ? <p className="arena-empty" role="status">Carregando jogador...</p>
        : error || !player ? <section className="arena-empty" role="alert"><p>{error || 'Cadastro não encontrado.'}</p><button className="arena-secondary mt-4" onClick={load}>Tentar novamente</button></section>
        : (
          <>
            <section className="organizer-panel relative overflow-hidden rounded-2xl bg-[#19382b] p-6 text-white sm:p-9">
              <div className="flex items-center gap-5">
                <Avatar player={player} className="size-20" />
                <div className="min-w-0">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#d7f36a]">Jogador</p>
                  <h1 className="font-display break-words text-4xl font-bold tracking-tight sm:text-5xl">{player.nome}</h1>
                </div>
              </div>
            </section>
            <div className="my-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-[#747b70]">Gerencie as informações do atleta.</p>
              <div className="flex flex-wrap gap-3">
                <Link className="arena-primary" href={`/jogadores/${id}/editar`}><Pencil className="size-4" />Editar jogador</Link>
                <button className="arena-secondary text-red-800!" onClick={() => { setDeleteError(''); dialog.current?.showModal() }}><Trash2 className="size-4" />Excluir</button>
              </div>
            </div>
            <section className="max-w-3xl rounded-2xl border border-[#e5e7dd] bg-white p-6 sm:p-8">
              <h2 className="font-display text-2xl font-bold">Sobre o jogador</h2>
              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                <div><dt className="flex items-center gap-2 text-xs text-[#7d8378]"><IdCard className="size-4" />Documento</dt><dd className="mt-1 font-semibold">{maskDocument(player.documento)}</dd></div>
                <div><dt className="flex items-center gap-2 text-xs text-[#7d8378]"><CalendarDays className="size-4" />Data de nascimento</dt><dd className="mt-1 font-semibold">{formatDate(player.data_nascimento) || 'Não informada'}</dd></div>
              </dl>
              <p className="mt-6 border-t border-[#e5e7dd] pt-4 text-xs text-[#7d8378]">O documento é exibido parcialmente por privacidade. Para ver ou alterar, abra a edição.</p>
            </section>
            <dialog ref={dialog} aria-labelledby="delete-title" aria-describedby="delete-description" className="arena-dialog" onCancel={event => { if (deleting) event.preventDefault() }}>
              <div className="p-6 sm:p-8">
                <Trash2 className="mb-4 size-8 text-red-700" />
                <h2 id="delete-title" className="font-display text-2xl font-bold">Excluir jogador?</h2>
                <p id="delete-description" className="mt-3 break-words text-sm leading-6 text-[#747b70]">Você está prestes a excluir <strong>{player.nome}</strong>. Essa ação não pode ser desfeita.</p>
                {deleteError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{deleteError}</p>}
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button autoFocus className="arena-secondary" disabled={deleting} onClick={() => dialog.current?.close()}>Cancelar</button>
                  <button className="arena-primary bg-red-800! text-white!" disabled={deleting} onClick={remove}>{deleting ? 'Excluindo...' : 'Confirmar exclusão'}</button>
                </div>
              </div>
            </dialog>
          </>
        )}
    </Shell>
  )
}