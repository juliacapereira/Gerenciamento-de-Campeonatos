'use client'

import {
  useEffect,
  useState,
  type FormEvent
} from 'react'

import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Shield,
  Swords,
  Trophy
} from 'lucide-react'

type Team = {
  id_time: number
  nome: string
  nome_abreviado?: string
}

type Match = {
  id_partida: number
  id_campeonato: number
  id_time_a: number
  id_time_b: number
  time_a: string
  time_b: string
  data_hora?: string | null
  local?: string | null
}

type Props = {
  championshipId: string
  canManage: boolean
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(
    `/api/${path}`,
    {
      cache: 'no-store',
      ...options
    }
  )

  let data

  try {
    data = await response.json()
  } catch {
    throw new Error(
      'Não foi possível conectar à API.'
    )
  }

  if (!response.ok) {
    throw new Error(
      data.erro ||
        'Não foi possível concluir a operação.'
    )
  }

  return data
}

export function MatchesSection({
  championshipId,
  canManage
}: Props) {
  const [teams, setTeams] =
    useState<Team[]>([])

  const [matches, setMatches] =
    useState<Match[]>([])

  const [teamA, setTeamA] =
    useState('')

  const [teamB, setTeamB] =
    useState('')
  
  const [dateTime, setDateTime] = useState('')

  const [location, setLocation] = useState('')

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      const [teamsData, matchesData] =
        await Promise.all([
          request<Team[]>(
            `campeonatos/${championshipId}/times`
          ),

          request<Match[]>(
            `campeonatos/${championshipId}/partidas`
          )
        ])

      setTeams(teamsData)
      setMatches(matchesData)

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Erro ao carregar partidas.'
      )

    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [championshipId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (saving) return

    setError('')
    setSuccess('')

    if (!teamA || !teamB) {
      setError(
        'Selecione os dois times da partida.'
      )

      return
    }

    if (teamA === teamB) {
      setError(
        'Os times da partida devem ser diferentes.'
      )

      return
    }

    if (!dateTime) {
      setError('Informe a data e o horário da partida.')
      return
    }

    setSaving(true)

    try {
      const result =
        await request<{
          id_partida: number
          mensagem: string
        }>(
          `campeonatos/${championshipId}/partidas`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({
              id_time_a:
                Number(teamA),

              id_time_b:
                Number(teamB),
              
              data_hora: dateTime,

              local: location
            })
          }
        )

      setSuccess(result.mensagem)

      setTeamA('')
      setTeamB('')
      setDateTime('')
      setLocation('')

      const updatedMatches =
        await request<Match[]>(
          `campeonatos/${championshipId}/partidas`
        )

      setMatches(updatedMatches)

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Não foi possível cadastrar a partida.'
      )

    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-[#e5e7dd] bg-white p-6 sm:p-8">

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#829c38]">
            Confrontos
          </p>

          <h2 className="font-display text-2xl font-bold">
            Partidas
          </h2>

          <p className="mt-2 text-sm text-[#747b70]">
            Confrontos cadastrados entre
            os times participantes deste
            campeonato.
          </p>
        </div>

        <Swords className="size-8 text-[#789339]" />
      </div>


      {loading ? (
        <p
          className="arena-empty mt-6"
          role="status"
        >
          Carregando partidas...
        </p>
      ) : (
        <>

          {/* ==========================================
              FORMULÁRIO DE CADASTRO
              Somente proprietário
              ========================================== */}

          {canManage && (
            <form
              onSubmit={submit}
              className="mt-7 rounded-xl border border-[#e0e5d4] bg-[#edf1e4] p-5"
            >
              <h3 className="font-display text-xl font-bold">
                Cadastrar partida
              </h3>

              <p className="mt-1 text-xs text-[#68765c]">
                Escolha dois times
                diferentes inscritos neste
                campeonato.
              </p>

              {teams.length < 2 ? (
                <div className="mt-5 rounded-lg bg-white p-4 text-sm text-[#747b70]">
                  É necessário ter pelo
                  menos dois times
                  inscritos para cadastrar
                  uma partida.
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">

                  <div>
                    <label
                      htmlFor="id_time_a"
                      className="mb-2 block text-xs font-bold"
                    >
                      Time A
                    </label>

                    <select
                      id="id_time_a"
                      className="arena-input"
                      value={teamA}
                      disabled={saving}
                      required
                      onChange={event =>
                        setTeamA(
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Selecione o Time A
                      </option>

                      {teams.map(team => (
                        <option
                          key={team.id_time}
                          value={
                            team.id_time
                          }
                          disabled={
                            String(
                              team.id_time
                            ) === teamB
                          }
                        >
                          {team.nome}
                        </option>
                      ))}
                    </select>
                  </div>


                  <div className="hidden pb-3 md:block">
                    <span className="font-display text-lg font-bold text-[#789339]">
                      X
                    </span>
                  </div>


                  <div>
                    <label
                      htmlFor="id_time_b"
                      className="mb-2 block text-xs font-bold"
                    >
                      Time B
                    </label>

                    <select
                      id="id_time_b"
                      className="arena-input"
                      value={teamB}
                      disabled={saving}
                      required
                      onChange={event =>
                        setTeamB(
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Selecione o Time B
                      </option>

                      {teams.map(team => (
                        <option
                          key={team.id_time}
                          value={
                            team.id_time
                          }
                          disabled={
                            String(
                              team.id_time
                            ) === teamA
                          }
                        >
                          {team.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="data_hora"
                        className="mb-2 block text-xs font-bold"
                      >
                        Data e Horário <span className="text-[#829c38]">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        id="data_hora"
                        className="arena-input"
                        value={dateTime}
                        disabled={saving}
                        required
                        onChange={event => setDateTime(event.target.value)}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="local"
                        className="mb-2 block text-xs font-bold"
                      >
                        Local da Partida
                      </label>
                      <input
                        type="text"
                        id="local"
                        className="arena-input"
                        placeholder="Ex.: Quadra Principal, Ginásio..."
                        maxLength={255}
                        value={location}
                        disabled={saving}
                        onChange={event => setLocation(event.target.value)}
                      />
                    </div>
                  </div>
                </div>  
                
              )}


              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
                >
                  {error}
                </p>
              )}


              {success && (
                <p
                  role="status"
                  className="mt-4 rounded-lg bg-white p-3 text-sm font-semibold text-[#68795c]"
                >
                  {success}
                </p>
              )}


              {teams.length >= 2 && (
                <div className="mt-5 flex justify-end">
                  <button
                    type="submit"
                    className="arena-primary"
                    disabled={
                      saving ||
                      !teamA ||
                      !teamB ||
                      !dateTime ||
                      teamA === teamB
                    }
                  >
                    {saving
                      ? 'Cadastrando...'
                      : 'Cadastrar partida'}

                    <ArrowRight className="size-4" />
                  </button>
                </div>
              )}
            </form>
          )}


          {/* ==========================================
              ERRO DE CARREGAMENTO
              ========================================== */}

          {!canManage && error && (
            <p
              role="alert"
              className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-800"
            >
              {error}
            </p>
          )}


          {/* ==========================================
              LISTAGEM DAS PARTIDAS
              ========================================== */}

          <div className="mt-8">

            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="font-display text-xl font-bold">
                Partidas cadastradas
              </h3>

              <span className="text-xs text-[#7d8378]">
                {matches.length}{' '}
                {matches.length === 1
                  ? 'partida'
                  : 'partidas'}
              </span>
            </div>


            {matches.length === 0 ? (
              <div className="arena-empty">
                <Trophy className="mx-auto mb-4 size-9 text-[#829c38]" />

                <h3 className="font-display text-xl font-bold">
                  Nenhuma partida cadastrada
                </h3>

                <p className="mt-2 text-sm text-[#7d8378]">
                  {canManage
                    ? 'Escolha dois times inscritos para cadastrar o primeiro confronto.'
                    : 'Ainda não existem confrontos cadastrados neste campeonato.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">

                {matches.map(match => (
                  <article
                    key={
                      match.id_partida
                    }
                    className="rounded-xl border border-[#e5e7dd] p-5"
                  >

                    <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">

                      <div className="text-center sm:text-right">
                        <div className="mb-2 flex justify-center sm:justify-end">
                          <Shield className="size-6 text-[#789339]" />
                        </div>

                        <p className="font-display text-lg font-bold">
                          {match.time_a}
                        </p>
                      </div>


                      <div className="text-center">
                        <span className="inline-flex size-10 items-center justify-center rounded-full bg-[#19382b] font-display font-bold text-white">
                          X
                        </span>
                      </div>


                      <div className="text-center sm:text-left">
                        <div className="mb-2 flex justify-center sm:justify-start">
                          <Shield className="size-6 text-[#789339]" />
                        </div>

                        <p className="font-display text-lg font-bold">
                          {match.time_b}
                        </p>
                      </div>

                    </div>
                    {(match.data_hora || match.local) && (
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-[#e5e7dd] pt-3 text-xs text-[#7d8378]">
                        {match.data_hora && (
                          <span className="inline-flex items-center gap-1.5 font-semibold">
                            <CalendarDays className="size-4 text-[#829c38]" />
                            {new Date(match.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        )}

                        {match.local && (
                          <span className="inline-flex items-center gap-1.5 font-semibold">
                            <MapPin className="size-4 text-[#829c38]" />
                            {match.local}
                          </span>
                        )}
                      </div>
                    )}

                  </article>
                ))}

              </div>
            )}

          </div>

        </>
      )}
    </section>
  )
}