'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, MapPin, Pencil, Trash2, Plus, Search, Shield, Trophy } from 'lucide-react'
import { Header, Footer } from './arena-home'
import { SquadSection } from './elenco'
import { EntriesSection } from './inscricoes'
import { useAdmin } from '@/hooks/use-admin'

type Kind = 'campeonatos' | 'times'
type Sport = { id_esporte: number; nome: string }
type Entry = {
  id_campeonato?: number
  id_time?: number
  id_esporte?: number
  nome: string
  esporte: string
  descricao?: string
  nome_abreviado?: string
  cidade?: string
  escudo_url?: string
  data_inicial?: string
  data_fim?: string
  status?: string
}

const statuses: Record<string, string> = {
  PLANEJADO: 'Planejado',
  INSCRICOES: 'Inscrições abertas',
  EM_ANDAMENTO: 'Em andamento',
  ENCERRADO: 'Encerrado'
}

const labels = {
  campeonatos: {
    title: 'Campeonatos',
    singular: 'campeonato',
    action: 'Criar campeonato',
    subtitle: 'Cada competição é uma nova história. Organize a próxima.'
  },
  times: {
    title: 'Times',
    singular: 'time',
    action: 'Cadastrar time',
    subtitle: 'O esporte da comunidade começa com quem entra em campo.'
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/${path}`, { cache: 'no-store', ...options })

  let data

  try {
    data = await response.json()
  } catch {
    throw new Error('Não foi possível conectar à API. Verifique se o backend está em execução.')
  }

  if (!response.ok) throw new Error(data.erro || 'Não foi possível concluir a operação.')

  return data
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="section-wrap min-h-[70vh] py-10 sm:py-14">
        {children}
      </main>
      <Footer />
    </>
  )
}

function Banner({
  kind,
  form = false,
  editing = false
}: {
  kind: Kind
  form?: boolean
  editing?: boolean
}) {
  const Icon = kind === 'campeonatos' ? Trophy : Shield

  return (
    <div className="organizer-panel relative mb-8 overflow-hidden rounded-2xl bg-[#19382b] p-6 text-white sm:p-9">
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-[#d7f36a]">
            Para quem faz acontecer
          </p>

          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            {editing
              ? `Editar ${labels[kind].singular}`
              : form
                ? labels[kind].action
                : labels[kind].title}
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
            {labels[kind].subtitle}
          </p>
        </div>

        <Icon
          aria-hidden="true"
          className="hidden size-20 shrink-0 text-[#d7f36a]/70 sm:block"
        />
      </div>
    </div>
  )
}

export function ManagementList({ kind }: { kind: Kind }) {
  const { isAdmin } = useAdmin()

  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [sport, setSport] = useState('')
  const [status, setStatus] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      setEntries(await request<Entry[]>(kind))
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [kind]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = entries.filter(
    entry =>
      `${entry.nome} ${entry.cidade || ''}`
        .toLocaleLowerCase('pt-BR')
        .includes(query.toLocaleLowerCase('pt-BR')) &&
      (!sport || entry.esporte === sport) &&
      (!status || entry.status === status)
  )

  return (
    <Shell>
      <Banner kind={kind} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">
            {kind === 'campeonatos'
              ? 'Competições da comunidade'
              : 'Equipes da comunidade'}
          </h2>

          <p className="mt-1 text-xs text-[#7d8378]">
            {entries.length} {kind} cadastrados
          </p>
        </div>

        {isAdmin && (
          <Link
            className="arena-primary"
            href={`/${kind}/novo`}
          >
            <Plus className="size-4" />
            {labels[kind].action}
          </Link>
        )}
      </div>

      <div className="mb-7 flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-3.5 size-4 text-[#7d8378]" />

          <input
            aria-label={`Pesquisar ${kind}`}
            className="arena-input pl-10!"
            placeholder={`Pesquisar ${kind}${kind === 'times' ? ' ou cidade' : ''}...`}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <select
          className="arena-input w-full! sm:w-auto!"
          aria-label="Filtrar por esporte"
          value={sport}
          onChange={e => setSport(e.target.value)}
        >
          <option value="">Todos os esportes</option>

          {Array.from(
            new Set(entries.map(entry => entry.esporte).filter(Boolean))
          )
            .sort()
            .map(name => (
              <option key={name}>{name}</option>
            ))}
        </select>

        {kind === 'campeonatos' && (
          <select
            aria-label="Filtrar por status"
            className="arena-input w-full! sm:w-auto!"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">Todos os status</option>

            {Object.entries(statuses).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <p role="status" className="arena-empty">
          Carregando {kind}...
        </p>
      ) : error ? (
        <div role="alert" className="arena-empty">
          <p>{error}</p>

          <button
            className="arena-secondary mt-4"
            onClick={load}
          >
            Tentar novamente
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="arena-empty">
          <Trophy className="mx-auto mb-4 size-9 text-[#829c38]" />

          <h3 className="font-display text-2xl font-bold">
            {entries.length
              ? 'Nenhum resultado encontrado'
              : 'A próxima história começa aqui'}
          </h3>

          <p className="mt-2 text-sm text-[#7d8378]">
            {entries.length
              ? 'Experimente outro nome ou filtro.'
              : isAdmin
                ? `Cadastre o primeiro ${labels[kind].singular} da comunidade.`
                : `Nenhum ${labels[kind].singular} cadastrado no momento.`}
          </p>

          {!entries.length && isAdmin && (
            <Link
              className="arena-primary mt-5"
              href={`/${kind}/novo`}
            >
              {labels[kind].action}
              <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(entry => {
            const entryId = entry.id_campeonato ?? entry.id_time

            return (
              <article
                key={entryId}
                className="overflow-hidden rounded-xl border border-[#e5e7dd] bg-white"
              >
                <div className="champ-banner champ-green flex h-28 items-center justify-between px-5">
                  <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-bold text-white">
                    {entry.esporte || 'Sem esporte'}
                  </span>

                  <div className="champ-emblem">
                    {(entry.nome_abreviado ||
                      entry.nome
                        .split(' ')
                        .map(word => word[0])
                        .join(''))
                      .slice(0, 3)
                      .toUpperCase()}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="font-display break-words text-2xl font-bold">
                    <Link
                      className="hover:text-[#789339]"
                      href={`/${kind}/${entryId}`}
                    >
                      {entry.nome}
                    </Link>
                  </h3>

                  {kind === 'campeonatos' ? (
                    <>
                      <span className="status-dot mt-3">
                        {statuses[entry.status || ''] || entry.status}
                      </span>

                      <p className="mt-4 flex items-center gap-2 text-xs text-[#7d8378]">
                        <CalendarDays className="size-4 shrink-0" />
                        {formatDate(entry.data_inicial)} — {formatDate(entry.data_fim)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 flex items-center gap-2 text-xs text-[#7d8378]">
                      <MapPin className="size-4" />
                      {entry.cidade || 'Cidade não informada'}
                    </p>
                  )}

                  {entry.descricao && (
                    <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-[#747b70]">
                      {entry.descricao}
                    </p>
                  )}

                  {entry.escudo_url && (
                    <a
                      className="mt-4 inline-block text-xs font-bold underline"
                      href={entry.escudo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver escudo
                    </a>
                  )}

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e5e7dd] pt-4">
                    <Link
                      className="inline-flex items-center gap-2 text-xs font-bold"
                      href={`/${kind}/${entryId}`}
                    >
                      Ver {labels[kind].singular}
                      <ArrowRight className="size-4" />
                    </Link>

                    {isAdmin && (
                      <Link
                        className="inline-flex items-center gap-1 text-xs text-[#68795c]"
                        href={`/${kind}/${entryId}/editar`}
                      >
                        <Pencil className="size-3.5" />
                        Editar
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </Shell>
  )
}

function formatDate(date?: string) {
  return date
    ? new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')
    : ''
}

function Field({
  name,
  label,
  required = false,
  children
}: {
  name: string
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-xs font-bold"
      >
        {label}
        {required && <span className="text-[#829c38]"> *</span>}
      </label>

      {children}
    </div>
  )
}

export function ManagementForm({
  kind,
  id
}: {
  kind: Kind
  id?: string
}) {
  const [entry, setEntry] = useState<Entry | null>(null)
  const [savedId, setSavedId] = useState<string | number | undefined>(id)
  const [sports, setSports] = useState<Sport[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [start, setStart] = useState('')

  async function loadSports() {
    setLoading(true)
    setLoadError('')

    try {
      const [sports, record] = await Promise.all([
        request<Sport[]>('esportes'),
        id
          ? request<Entry>(`${kind}/${id}`)
          : Promise.resolve(null)
      ])

      setSports(sports)
      setEntry(record)
      setStart(record?.data_inicial?.slice(0, 10) || '')
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Erro ao carregar esportes.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSports()
  }, [kind, id])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (saving) return

    const values = Object.fromEntries(
      new FormData(event.currentTarget)
    )

    const body = {
      ...values,
      id_esporte: Number(values.id_esporte)
    }

    setError('')
    setSaving(true)

    try {
      const result = await request<{
        mensagem: string
        id_campeonato?: number
        id_time?: number
      }>(
        id ? `${kind}/${id}` : kind,
        {
          method: id ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      )

      setSavedId(
        id ||
        result.id_campeonato ||
        result.id_time
      )

      setSuccess(result.mensagem)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Erro ao salvar dados.'
      )
    } finally {
      setSaving(false)
    }
  }

  const championship = kind === 'campeonatos'

  return (
    <Shell>
      <Link
        className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-[#68795c]"
        href={`/${kind}`}
      >
        <ArrowLeft className="size-4" />
        Voltar para {kind}
      </Link>

      <Banner
        kind={kind}
        form
        editing={!!id}
      />

      {success ? (
        <section
          className="arena-empty"
          role="status"
        >
          <CheckCircle2 className="mx-auto mb-4 size-12 text-[#829c38]" />

          <h2 className="font-display text-3xl font-bold">
            {success}
          </h2>

          <p className="mt-3 text-sm text-[#747b70]">
            Tudo pronto! O cadastro já está disponível na listagem.
          </p>

          <Link
            className="arena-primary mt-6"
            href={`/${kind}/${savedId}`}
          >
            Abrir {labels[kind].singular}
            <ArrowRight className="size-4" />
          </Link>
        </section>
      ) : loading ? (
        <p
          role="status"
          className="arena-empty"
        >
          Carregando formulário...
        </p>
      ) : id && !entry ? (
        <div
          className="arena-empty"
          role="alert"
        >
          <p>
            {loadError || 'Cadastro não encontrado.'}
          </p>

          <button
            className="arena-secondary mt-4"
            onClick={loadSports}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
          <form
            key={`${kind}-${id || 'novo'}`}
            onSubmit={submit}
            className="rounded-2xl border border-[#e5e7dd] bg-white p-6 sm:p-8"
          >
            <h2 className="font-display text-2xl font-bold">
              {championship
                ? 'Dados da competição'
                : 'Identidade do time'}
            </h2>

            <p className="mb-7 mt-2 text-xs text-[#7d8378]">
              Preencha os campos abaixo. Os campos com * são obrigatórios.
            </p>

            {loadError && (
              <div
                role="alert"
                className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-800"
              >
                {loadError}

                <button
                  type="button"
                  className="mt-2 block underline"
                  onClick={loadSports}
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {!loading && !loadError && !sports.length && (
              <p
                role="alert"
                className="mb-5 text-sm text-red-800"
              >
                Nenhum esporte disponível. Cadastre os esportes no banco antes de continuar.
              </p>
            )}

            <fieldset
              disabled={saving}
              className="grid gap-5"
            >
              <Field
                name="nome"
                label={championship ? 'Nome do campeonato' : 'Nome do time'}
                required
              >
                <input
                  className="arena-input"
                  id="nome"
                  name="nome"
                  defaultValue={entry?.nome || ''}
                  required
                  minLength={2}
                  maxLength={150}
                  placeholder={
                    championship
                      ? 'Ex.: Copa da Comunidade 2026'
                      : 'Ex.: Esporte Clube Primavera'
                  }
                />
              </Field>

              <Field
                name="id_esporte"
                label="Esporte"
                required
              >
                <select
                  className="arena-input"
                  name="id_esporte"
                  id="id_esporte"
                  defaultValue={entry?.id_esporte || ''}
                  required
                  disabled={loading || !!loadError}
                >
                  <option
                    value=""
                    disabled
                  >
                    {loading
                      ? 'Carregando esportes...'
                      : 'Selecione o esporte'}
                  </option>

                  {sports.map(sport => (
                    <option
                      key={sport.id_esporte}
                      value={sport.id_esporte}
                    >
                      {sport.nome}
                    </option>
                  ))}
                </select>
              </Field>

              {championship ? (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      name="data_inicial"
                      label="Data de início"
                      required
                    >
                      <input
                        className="arena-input"
                        type="date"
                        name="data_inicial"
                        id="data_inicial"
                        required
                        min="1000-01-01"
                        max="9999-12-31"
                        value={start}
                        onChange={e => setStart(e.target.value)}
                      />
                    </Field>

                    <Field
                      name="data_fim"
                      label="Data de término"
                      required
                    >
                      <input
                        className="arena-input"
                        type="date"
                        name="data_fim"
                        id="data_fim"
                        defaultValue={entry?.data_fim?.slice(0, 10) || ''}
                        min={start || '1000-01-01'}
                        max="9999-12-31"
                        required
                      />
                    </Field>
                  </div>

                  <Field
                    name="status"
                    label={id ? 'Status' : 'Status inicial'}
                    required
                  >
                    <select
                      className="arena-input"
                      name="status"
                      id="status"
                      defaultValue={entry?.status || 'PLANEJADO'}
                    >
                      {Object.entries(statuses).map(([key, label]) => (
                        <option
                          key={key}
                          value={key}
                        >
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              ) : (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      name="nome_abreviado"
                      label="Nome abreviado / sigla"
                    >
                      <input
                        className="arena-input"
                        name="nome_abreviado"
                        id="nome_abreviado"
                        defaultValue={entry?.nome_abreviado || ''}
                        maxLength={30}
                        placeholder="Ex.: ECP"
                      />
                    </Field>

                    <Field
                      name="cidade"
                      label="Cidade"
                    >
                      <input
                        className="arena-input"
                        name="cidade"
                        id="cidade"
                        defaultValue={entry?.cidade || ''}
                        maxLength={100}
                        placeholder="Ex.: São Paulo"
                      />
                    </Field>
                  </div>

                  <Field
                    name="escudo_url"
                    label="Link do escudo"
                  >
                    <input
                      className="arena-input"
                      type="url"
                      name="escudo_url"
                      id="escudo_url"
                      defaultValue={entry?.escudo_url || ''}
                      maxLength={500}
                      placeholder="https://exemplo.com/escudo.png"
                    />

                    <p className="mt-2 text-xs text-[#7d8378]">
                      Opcional. Use um endereço HTTP ou HTTPS.
                    </p>
                  </Field>
                </>
              )}

              <Field
                name="descricao"
                label="Descrição"
              >
                <textarea
                  className="arena-input min-h-28 resize-y"
                  id="descricao"
                  name="descricao"
                  defaultValue={entry?.descricao || ''}
                  maxLength={5000}
                  rows={4}
                  placeholder={
                    championship
                      ? 'Conte sobre a competição e sua proposta...'
                      : 'Conte a história da equipe...'
                  }
                />
              </Field>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 p-4 text-sm text-red-800"
                >
                  {error}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-[#e5e7dd] pt-5">
                <Link
                  className="arena-secondary"
                  href={id ? `/${kind}/${id}` : `/${kind}`}
                >
                  Cancelar
                </Link>

                <button
                  className="arena-primary"
                  type="submit"
                  disabled={
                    saving ||
                    loading ||
                    !!loadError ||
                    !sports.length
                  }
                >
                  {saving
                    ? 'Salvando...'
                    : id
                      ? 'Salvar alterações'
                      : labels[kind].action}

                  <ArrowRight className="size-4" />
                </button>
              </div>
            </fieldset>
          </form>

          <aside className="rounded-2xl border border-[#e0e5d4] bg-[#edf1e4] p-6">
            <Trophy className="mb-4 size-7 text-[#789339]" />

            <h2 className="font-display text-2xl font-bold">
              {championship
                ? 'Dê início à próxima temporada'
                : 'Todo time tem uma história'}
            </h2>

            <p className="mt-3 text-sm leading-7 text-[#68765c]">
              {championship
                ? 'Escolha o esporte, defina o período e indique a fase atual da competição. Um bom planejamento começa com essas informações.'
                : 'Identifique a equipe pelo nome, esporte e cidade. A sigla ajuda a reconhecer o time nos cartões da plataforma.'}
            </p>

            <Link
              className="mt-5 inline-flex items-center gap-2 text-xs font-bold"
              href={championship ? '/times/novo' : '/campeonatos/novo'}
            >
              {championship
                ? 'Cadastre também seus times'
                : 'Crie um campeonato'}

              <ArrowRight className="size-4" />
            </Link>
          </aside>
        </div>
      )}
    </Shell>
  )
}

export function ManagementDetail({
  kind,
  id
}: {
  kind: Kind
  id: string
}) {
  const { isAdmin } = useAdmin()

  const dialog = useRef<HTMLDialogElement>(null)
  const [entry, setEntry] = useState<Entry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleted, setDeleted] = useState(false)

  async function load() {
    setLoading(true)
    setError('')

    try {
      setEntry(await request<Entry>(`${kind}/${id}`))
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Erro ao carregar cadastro.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [kind, id])

  async function remove() {
    if (deleting) return

    setDeleting(true)
    setDeleteError('')

    try {
      await request(`${kind}/${id}`, {
        method: 'DELETE'
      })

      dialog.current?.close()
      setDeleted(true)
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir.'
      )
    } finally {
      setDeleting(false)
    }
  }

  const championship = kind === 'campeonatos'

  return (
    <Shell>
      <Link
        className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-[#68795c]"
        href={`/${kind}`}
      >
        <ArrowLeft className="size-4" />
        Voltar para {kind}
      </Link>

      {deleted ? (
        <section
          className="arena-empty"
          role="status"
        >
          <CheckCircle2 className="mx-auto mb-4 size-12 text-[#829c38]" />

          <h1 className="font-display text-3xl font-bold">
            {championship
              ? 'Campeonato excluído'
              : 'Time excluído'}{' '}
            com sucesso!
          </h1>

          <Link
            className="arena-primary mt-6"
            href={`/${kind}`}
          >
            Voltar para {kind}
            <ArrowRight className="size-4" />
          </Link>
        </section>
      ) : loading ? (
        <p
          className="arena-empty"
          role="status"
        >
          Carregando {labels[kind].singular}...
        </p>
      ) : error || !entry ? (
        <section
          className="arena-empty"
          role="alert"
        >
          <p>
            {error || 'Cadastro não encontrado.'}
          </p>

          <button
            className="arena-secondary mt-4"
            onClick={load}
          >
            Tentar novamente
          </button>
        </section>
      ) : (
        <>
          <section className="organizer-panel relative overflow-hidden rounded-2xl bg-[#19382b] p-6 text-white sm:p-9">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-[#d7f36a]">
              {entry.esporte || 'Esporte não informado'}
            </p>

            <h1 className="font-display break-words text-4xl font-bold tracking-tight sm:text-5xl">
              {entry.nome}
            </h1>

            <div className="mt-5 flex flex-wrap gap-3">
              {championship ? (
                <>
                  <span className="status-dot">
                    {statuses[entry.status || '']}
                  </span>

                  <span className="inline-flex items-center gap-2 text-sm text-white/75">
                    <CalendarDays className="size-4" />
                    {formatDate(entry.data_inicial)} — {formatDate(entry.data_fim)}
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm text-white/75">
                  <MapPin className="size-4" />
                  {entry.cidade || 'Cidade não informada'}
                </span>
              )}
            </div>
          </section>

          <div className="my-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-[#747b70]">
              {isAdmin
                ? `Gerencie as informações ${championship ? 'da competição' : 'da equipe'}.`
                : `Informações ${championship ? 'da competição' : 'da equipe'}.`}
            </p>

            {isAdmin && (
              <div className="flex flex-wrap gap-3">
                <Link
                  className="arena-primary"
                  href={`/${kind}/${id}/editar`}
                >
                  <Pencil className="size-4" />
                  Editar {labels[kind].singular}
                </Link>

                <button
                  className="arena-secondary text-red-800!"
                  onClick={() => {
                    setDeleteError('')
                    dialog.current?.showModal()
                  }}
                >
                  <Trash2 className="size-4" />
                  Excluir
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <section className="rounded-2xl border border-[#e5e7dd] bg-white p-6 sm:p-8">
              <h2 className="font-display text-2xl font-bold">
                {championship
                  ? 'Sobre o campeonato'
                  : 'Sobre o time'}
              </h2>

              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-[#747b70]">
                {entry.descricao ||
                  'Nenhuma descrição adicionada. Edite o cadastro para contar mais sobre essa história.'}
              </p>

              <dl className="mt-6 grid gap-5 border-t border-[#e5e7dd] pt-6 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-[#7d8378]">
                    Esporte
                  </dt>

                  <dd className="mt-1 font-semibold">
                    {entry.esporte || 'Não informado'}
                  </dd>
                </div>

                {championship ? (
                  <>
                    <div>
                      <dt className="text-xs text-[#7d8378]">
                        Status
                      </dt>

                      <dd className="mt-1 font-semibold">
                        {statuses[entry.status || '']}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-[#7d8378]">
                        Data de início
                      </dt>

                      <dd className="mt-1 font-semibold">
                        {formatDate(entry.data_inicial)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-[#7d8378]">
                        Data de término
                      </dt>

                      <dd className="mt-1 font-semibold">
                        {formatDate(entry.data_fim)}
                      </dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <dt className="text-xs text-[#7d8378]">
                        Sigla / nome abreviado
                      </dt>

                      <dd className="mt-1 break-words font-semibold">
                        {entry.nome_abreviado || 'Não informado'}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-[#7d8378]">
                        Cidade
                      </dt>

                      <dd className="mt-1 break-words font-semibold">
                        {entry.cidade || 'Não informada'}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </section>

            <aside className="rounded-2xl border border-[#e0e5d4] bg-[#edf1e4] p-6">
              <div className="champ-banner champ-green flex h-36 items-center justify-center rounded-xl">
                <div className="champ-emblem">
                  {(entry.nome_abreviado ||
                    entry.nome
                      .split(' ')
                      .map(word => word[0])
                      .join(''))
                    .slice(0, 3)
                    .toUpperCase()}
                </div>
              </div>

              <h2 className="mt-5 font-display text-xl font-bold">
                {championship
                  ? 'Uma competição da comunidade'
                  : 'Identidade da equipe'}
              </h2>

              {entry.escudo_url ? (
                <a
                  href={entry.escudo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="arena-secondary mt-4"
                >
                  Abrir escudo
                  <ArrowRight className="size-4" />
                </a>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[#68765c]">
                  {championship
                    ? 'Nome, esporte e período reúnem as informações essenciais da competição.'
                    : 'O emblema utiliza a sigla do time. Você pode adicionar um link para o escudo ao editar.'}
                </p>
              )}
            </aside>
          </div>

          {!championship && (
            <SquadSection
              teamId={id}
              sport={entry.esporte}
            />
          )}

          {championship && entry.id_esporte ? (
            <EntriesSection
              championshipId={id}
              sportId={entry.id_esporte}
              sport={entry.esporte}
            />
          ) : null}

          {isAdmin && (
            <dialog
              ref={dialog}
              aria-labelledby="delete-title"
              aria-describedby="delete-description"
              className="arena-dialog"
              onCancel={event => {
                if (deleting) event.preventDefault()
              }}
            >
              <div className="p-6 sm:p-8">
                <Trash2 className="mb-4 size-8 text-red-700" />

                <h2
                  id="delete-title"
                  className="font-display text-2xl font-bold"
                >
                  Excluir {labels[kind].singular}?
                </h2>

                <p
                  id="delete-description"
                  className="mt-3 break-words text-sm leading-6 text-[#747b70]"
                >
                  Você está prestes a excluir{' '}
                  <strong>{entry.nome}</strong>.
                  Essa ação não pode ser desfeita.
                </p>

                {deleteError && (
                  <p
                    role="alert"
                    className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
                  >
                    {deleteError}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    autoFocus
                    className="arena-secondary"
                    disabled={deleting}
                    onClick={() => dialog.current?.close()}
                  >
                    Cancelar
                  </button>

                  <button
                    className="arena-primary bg-red-800! text-white!"
                    disabled={deleting}
                    onClick={remove}
                  >
                    {deleting
                      ? 'Excluindo...'
                      : 'Confirmar exclusão'}
                  </button>
                </div>
              </div>
            </dialog>
          )}
        </>
      )}
    </Shell>
  )
}