'use client'

// US08 / US09 - Elenco do time: escolher jogadores já cadastrados, definir posição (lista do esporte) e camisa.
import Link from 'next/link'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { request } from './api'
import { Avatar, PositionChips } from './shared'

type Member = { id_elenco: number; id_jogador: number; nome: string; foto_url?: string | null; posicao?: string | null; numero_camisa?: number | null }
type Candidate = { id_jogador: number; nome: string }
type Positions = Record<string, string[]>

const normalize = (text?: string | null) => (text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
const split = (value?: string | null) => (value ?? '').split(',').map(item => item.trim()).filter(Boolean)

export function SquadSection({ teamId, sport }: { teamId: string; sport?: string }) {
  const [members, setMembers] = useState<Member[]>([])
  const [players, setPlayers] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Positions>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [chosen, setChosen] = useState<string[]>([])
  const [text, setText] = useState('')
  const [shirt, setShirt] = useState('')
  const [editing, setEditing] = useState<Member | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirming, setConfirming] = useState<number | null>(null)

  // Lista de posições do esporte do time. Sem lista (esporte novo), a posição é texto livre.
  const options = Object.entries(positions).find(([name]) => normalize(name) === normalize(sport))?.[1]
  const available = players.filter(player => !members.some(member => member.id_jogador === player.id_jogador))

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [squad, all, list] = await Promise.all([request<Member[]>(`times/${teamId}/jogadores`), request<Candidate[]>('jogadores'), request<Positions>('posicoes')])
      setMembers(squad); setPlayers(all); setPositions(list)
    } catch (error) { setError(error instanceof Error ? error.message : 'Erro ao carregar o elenco.') }
    finally { setLoading(false) }
  }, [teamId])
  useEffect(() => { void load() }, [load])

  async function refresh() { setMembers(await request<Member[]>(`times/${teamId}/jogadores`)) }
  function reset() { setPlayerId(''); setChosen([]); setText(''); setShirt(''); setEditing(null); setFormError('') }
  function toggle(name: string) { setChosen(current => current.includes(name) ? current.filter(item => item !== name) : [...current, name]) }
  function startEdit(member: Member) {
    setEditing(member); setPlayerId(String(member.id_jogador)); setShirt(member.numero_camisa == null ? '' : String(member.numero_camisa))
    setChosen(split(member.posicao)); setText(member.posicao ?? ''); setFormError(''); setNotice('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    if (!editing && !playerId) return setFormError('Selecione um jogador.')
    const posicao = options ? chosen.join(', ') : text.trim()
    const body = { posicao: posicao || null, numero_camisa: shirt === '' ? null : Number(shirt) }
    setFormError(''); setNotice(''); setSaving(true)
    try {
      const result = editing
        ? await request<{ mensagem: string }>(`times/${teamId}/jogadores/${editing.id_jogador}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await request<{ mensagem: string }>(`times/${teamId}/jogadores`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_jogador: Number(playerId), ...body }) })
      setNotice(result.mensagem); reset(); await refresh()
    } catch (error) { setFormError(error instanceof Error ? error.message : 'Não foi possível salvar.') }
    finally { setSaving(false) }
  }

  async function remove(member: Member) {
    if (confirming !== member.id_jogador) { setConfirming(member.id_jogador); return }
    setFormError(''); setNotice('')
    try {
      const result = await request<{ mensagem: string }>(`times/${teamId}/jogadores/${member.id_jogador}`, { method: 'DELETE' })
      setNotice(result.mensagem); setConfirming(null)
      if (editing?.id_jogador === member.id_jogador) reset()
      await refresh()
    } catch (error) { setFormError(error instanceof Error ? error.message : 'Não foi possível remover.') }
  }

  return (
    <section aria-labelledby="elenco-title" className="mt-6 rounded-2xl border border-[#e5e7dd] bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="elenco-title" className="font-display text-2xl font-bold">Elenco</h2>
          <p className="mt-1 text-xs text-[#7d8378]">{members.length} {members.length === 1 ? 'jogador' : 'jogadores'}{sport ? ` · ${sport}` : ''}</p>
        </div>
        <Link className="text-xs font-bold text-[#68795c]" href="/jogadores/novo">Cadastrar novo jogador</Link>
      </div>

      {loading ? <p role="status" className="arena-empty mt-5">Carregando elenco...</p>
        : error ? <div role="alert" className="arena-empty mt-5"><p>{error}</p><button className="arena-secondary mt-4" onClick={load}>Tentar novamente</button></div>
        : (
          <>
            <form onSubmit={submit} className="mt-6 grid gap-5 rounded-xl border border-[#e5e7dd] bg-[#fbfbf8] p-5">
              <h3 className="font-display text-lg font-bold">{editing ? `Editar ${editing.nome}` : 'Adicionar jogador ao elenco'}</h3>
              <fieldset disabled={saving} className="grid gap-5">
                <div className="grid gap-5 sm:grid-cols-[1fr_140px]">
                  <div>
                    <label htmlFor="elenco-jogador" className="mb-2 block text-xs font-bold">Jogador<span className="text-[#829c38]"> *</span></label>
                    {editing ? <p className="arena-input">{editing.nome}</p> : (
                      <select id="elenco-jogador" className="arena-input" value={playerId} onChange={event => setPlayerId(event.target.value)} disabled={!available.length}>
                        <option value="">{available.length ? 'Selecione um jogador' : players.length ? 'Todos os jogadores já estão neste time' : 'Nenhum jogador cadastrado'}</option>
                        {available.map(player => <option key={player.id_jogador} value={player.id_jogador}>{player.nome}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label htmlFor="elenco-camisa" className="mb-2 block text-xs font-bold">Nº da camisa</label>
                    <input id="elenco-camisa" className="arena-input" type="number" min={0} max={999} step={1} value={shirt} onChange={event => setShirt(event.target.value)} placeholder="Ex.: 10" />
                  </div>
                </div>
                {options ? (
                  <fieldset>
                    <legend className="mb-2 text-xs font-bold">Posições em {sport} <span className="font-normal text-[#7d8378]">(pode marcar mais de uma)</span></legend>
                    <div className="flex flex-wrap gap-2">
                      {options.map(name => (
                        <button key={name} type="button" role="checkbox" aria-checked={chosen.includes(name)} onClick={() => toggle(name)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-bold ${chosen.includes(name) ? 'border-[#829c38] bg-[#eef1e5] text-[#47591a]' : 'border-[#e5e7dd] bg-white text-[#68795c]'}`}>{name}</button>
                      ))}
                    </div>
                  </fieldset>
                ) : (
                  <div>
                    <label htmlFor="elenco-posicao" className="mb-2 block text-xs font-bold">Posição</label>
                    <input id="elenco-posicao" className="arena-input" value={text} onChange={event => setText(event.target.value)} maxLength={80} placeholder="Este esporte ainda não tem lista de posições" />
                  </div>
                )}
                {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{formError}</p>}
                <div className="flex flex-wrap justify-end gap-3">
                  {editing && <button type="button" className="arena-secondary" onClick={reset}>Cancelar edição</button>}
                  <button className="arena-primary" type="submit" disabled={saving || (!editing && !playerId)}>
                    {editing ? <><Pencil className="size-4" />{saving ? 'Salvando...' : 'Salvar alterações'}</> : <><Plus className="size-4" />{saving ? 'Adicionando...' : 'Adicionar ao elenco'}</>}
                  </button>
                </div>
              </fieldset>
            </form>

            {notice && <p role="status" className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#47591a]"><CheckCircle2 className="size-4" />{notice}</p>}

            {members.length === 0 ? (
              <div className="arena-empty mt-5"><Users className="mx-auto mb-3 size-8 text-[#829c38]" /><p className="text-sm text-[#7d8378]">Este time ainda não tem jogadores. Escolha um acima para montar o elenco.</p></div>
            ) : (
              <ul className="mt-5 divide-y divide-[#e5e7dd]">
                {members.map(member => (
                  <li key={member.id_jogador} className="flex flex-wrap items-center gap-4 py-4">
                    <Avatar player={member} className="size-11" />
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold"><Link className="hover:text-[#789339]" href={`/jogadores/${member.id_jogador}`}>{member.nome}</Link>{member.numero_camisa != null && <span className="ml-2 text-xs font-bold text-[#7d8378]">#{member.numero_camisa}</span>}</p>
                      <div className="mt-1.5"><PositionChips value={member.posicao} /></div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <button className="inline-flex items-center gap-1 text-[#68795c]" onClick={() => startEdit(member)}><Pencil className="size-3.5" />Editar</button>
                      <button className="inline-flex items-center gap-1 text-red-800" onClick={() => remove(member)} onBlur={() => setConfirming(null)}><Trash2 className="size-3.5" />{confirming === member.id_jogador ? 'Confirmar remoção' : 'Remover'}</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
    </section>
  )
}
