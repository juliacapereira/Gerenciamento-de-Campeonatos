'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Trash2, Users } from 'lucide-react'
import { request } from './api'

type Team = { id_time: number; id_esporte?: number | null; nome: string; cidade?: string | null }
type Entry = { id_campeonato_time: number; id_time: number; nome: string; cidade?: string | null }

// US10 - Inscrição de times: lista os times do mesmo esporte do campeonato e permite marcar os participantes.
export function EntriesSection({ championshipId, sportId, sport }: { championshipId: string; sportId: number; sport?: string }) {
  const [teams, setTeams] = useState<Team[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setLoadError('')
    try {
      const [all, current] = await Promise.all([
        request<Team[]>('times'),
        request<Entry[]>(`campeonatos/${championshipId}/times`),
      ])
      setTeams(all); setEntries(current)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erro ao carregar as inscrições.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [championshipId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Só aparecem times do mesmo esporte do campeonato que ainda não estão inscritos.
  const available = useMemo(
    () => teams.filter(team => Number(team.id_esporte) === Number(sportId) && !entries.some(entry => entry.id_time === team.id_time)),
    [teams, entries, sportId],
  )

  function toggle(id: number) {
    setSelected(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]))
  }

  async function enroll() {
    if (saving || !selected.length) return
    setSaving(true); setError(''); setNotice('')
    let done = 0
    const failures: string[] = []
    for (const id of selected) {
      try {
        await request(`campeonatos/${championshipId}/times`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_time: id }),
        })
        done++
      } catch (err) {
        const name = teams.find(team => team.id_time === id)?.nome ?? `Time ${id}`
        failures.push(`${name}: ${err instanceof Error ? err.message : 'não foi possível inscrever.'}`)
      }
    }
    if (done) setNotice(`${done} ${done === 1 ? 'time inscrito' : 'times inscritos'} com sucesso!`)
    if (failures.length) setError(failures.join(' '))
    setSelected([])
    await load()
    setSaving(false)
  }

  async function remove(entry: Entry) {
    if (saving || !window.confirm(`Remover ${entry.nome} deste campeonato?`)) return
    setSaving(true); setError(''); setNotice('')
    try {
      const result = await request<{ mensagem: string }>(`campeonatos/${championshipId}/times/${entry.id_time}`, { method: 'DELETE' })
      setNotice(result.mensagem)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível remover a inscrição.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby="inscricoes-title" className="mt-6 rounded-2xl border border-[#e5e7dd] bg-white p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <Users aria-hidden="true" className="size-6 text-[#789339]" />
        <h2 id="inscricoes-title" className="font-display text-2xl font-bold">Times participantes</h2>
      </div>
      <p className="mt-2 text-xs text-[#7d8378]">Só times de {sport || 'mesmo esporte'} podem ser inscritos neste campeonato.</p>

      {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="mt-5 flex items-center gap-2 rounded-lg bg-[#edf1e4] p-4 text-sm text-[#40502f]"><CheckCircle2 className="size-4" />{notice}</p>}

      {loading ? <p role="status" className="mt-6 text-sm text-[#7d8378]">Carregando times...</p>
        : loadError ? <div role="alert" className="mt-6 text-sm text-red-800">{loadError}<button type="button" className="arena-secondary mt-3" onClick={load}>Tentar novamente</button></div>
        : (
          <fieldset disabled={saving} className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold">Inscritos ({entries.length})</h3>
              {entries.length === 0 ? <p className="mt-3 text-sm text-[#7d8378]">Nenhum time inscrito ainda.</p> : (
                <ul className="mt-3 grid gap-2">
                  {entries.map(entry => (
                    <li key={entry.id_campeonato_time} className="flex items-center justify-between gap-3 rounded-lg border border-[#e5e7dd] p-3">
                      <span className="break-words text-sm font-semibold">{entry.nome}{entry.cidade && <span className="font-normal text-[#7d8378]"> · {entry.cidade}</span>}</span>
                      <button type="button" aria-label={`Remover ${entry.nome}`} className="shrink-0 text-red-800" onClick={() => remove(entry)}><Trash2 className="size-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold">Times disponíveis ({available.length})</h3>
              {available.length === 0 ? <p className="mt-3 text-sm text-[#7d8378]">Nenhum time de {sport || 'este esporte'} disponível para inscrição.</p> : (
                <>
                  <ul className="mt-3 grid gap-2">
                    {available.map(team => (
                      <li key={team.id_time}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#e5e7dd] p-3 text-sm">
                          <input type="checkbox" checked={selected.includes(team.id_time)} onChange={() => toggle(team.id_time)} />
                          <span className="break-words font-semibold">{team.nome}{team.cidade && <span className="font-normal text-[#7d8378]"> · {team.cidade}</span>}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="arena-primary mt-4" disabled={!selected.length || saving} onClick={enroll}>
                    {saving ? 'Salvando...' : `Inscrever selecionados (${selected.length})`}
                  </button>
                </>
              )}
            </div>
          </fieldset>
        )}
    </section>
  )
}