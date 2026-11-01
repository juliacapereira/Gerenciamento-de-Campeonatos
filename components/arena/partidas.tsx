'use client'

import Link from 'next/link'

import {
  useEffect,
  useState,
  type FormEvent
} from 'react'

import {
  ArrowRight,
  CalendarDays,
  Check,
  CloudSun,
  MapPin,
  Pencil,
  Save,
  Shield,
  Swords,
  Trophy,
  X
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
  clima?: string | null
}


type Props = {
  championshipId: string
  canManage: boolean
}


const weatherOptions = [
  'Ensolarado',
  'Parcialmente nublado',
  'Nublado',
  'Chuva',
  'Ventando',
  'Frio',
  'Calor'
]


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

  const [dateTime, setDateTime] =
    useState('')

  const [location, setLocation] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [
    savingClimate,
    setSavingClimate
  ] = useState<number | null>(null)

  const [
    editingClimate,
    setEditingClimate
  ] = useState<number | null>(null)

  const [
    weatherValues,
    setWeatherValues
  ] = useState<Record<number, string>>({})

  const [
    selectedWeather,
    setSelectedWeather
  ] = useState<Record<number, string[]>>({})

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')


  // ============================================================
  // CARREGAMENTO
  // ============================================================

  async function load() {

    setLoading(true)
    setError('')


    try {

      const [
        teamsData,
        matchesData
      ] = await Promise.all([

        request<Team[]>(
          `campeonatos/${championshipId}/times`
        ),

        request<Match[]>(
          `campeonatos/${championshipId}/partidas`
        )

      ])


      setTeams(teamsData)
      setMatches(matchesData)


      const initialWeather:
        Record<number, string> = {}

      const initialSelected:
        Record<number, string[]> = {}


      matchesData.forEach(match => {

        initialWeather[
          match.id_partida
        ] = match.clima || ''


        initialSelected[
          match.id_partida
        ] = weatherOptions.filter(option =>
          match.clima
            ?.toLowerCase()
            .includes(
              option.toLowerCase()
            )
        )

      })


      setWeatherValues(
        initialWeather
      )

      setSelectedWeather(
        initialSelected
      )


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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [championshipId])


  // ============================================================
  // CADASTRO DE PARTIDA
  // ============================================================

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

      setError(
        'Informe a data e o horário da partida.'
      )

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

              data_hora:
                dateTime,

              local:
                location

            })
          }
        )


      setSuccess(
        result.mensagem
      )


      setTeamA('')
      setTeamB('')
      setDateTime('')
      setLocation('')


      await load()


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


  // ============================================================
  // SELEÇÃO DAS CONDIÇÕES
  // Máximo de 2
  // ============================================================

  function toggleWeather(
    matchId: number,
    option: string
  ) {

    const current =
      selectedWeather[matchId] || []


    const alreadySelected =
      current.includes(option)


    let updated: string[]


    if (alreadySelected) {

      updated =
        current.filter(
          item => item !== option
        )

    } else {

      if (current.length >= 2) {

        setError(
          'Selecione no máximo duas condições climáticas.'
        )

        return
      }


      updated = [
        ...current,
        option
      ]
    }


    setError('')


    setSelectedWeather(
      previous => ({
        ...previous,
        [matchId]: updated
      })
    )


    const oldValue =
      weatherValues[matchId] || ''


    const temperatureMatch =
      oldValue.match(
        /\b\d{1,2}\s*°?\s*C\b/i
      )


    const temperature =
      temperatureMatch
        ? temperatureMatch[0]
        : ''


    const newDescription = [
      ...updated,
      temperature
    ]
      .filter(Boolean)
      .join(', ')


    setWeatherValues(
      previous => ({
        ...previous,
        [matchId]:
          newDescription
      })
    )
  }


  // ============================================================
  // US22 - SALVAR CLIMA
  // ============================================================

  async function saveClimate(
    matchId: number
  ) {

    if (savingClimate !== null) {
      return
    }


    setError('')
    setSuccess('')

    setSavingClimate(
      matchId
    )


    try {

      const clima =
        weatherValues[matchId]
          ?.trim() || ''


      const result =
        await request<{
          id_partida: number
          clima: string | null
          mensagem: string
        }>(
          `partidas/${matchId}/clima`,
          {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({
              clima
            })
          }
        )


      setMatches(
        current =>
          current.map(match =>

            match.id_partida ===
            matchId

              ? {
                  ...match,
                  clima: result.clima
                }

              : match

          )
      )


      setWeatherValues(
        current => ({
          ...current,

          [matchId]:
            result.clima || ''
        })
      )


      setSuccess(
        result.mensagem
      )


      setEditingClimate(null)


    } catch (error) {

      setError(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar as condições climáticas.'
      )

    } finally {

      setSavingClimate(null)

    }
  }


  // ============================================================
  // CANCELAR EDIÇÃO
  // ============================================================

  function cancelClimateEdit(
    match: Match
  ) {

    setWeatherValues(
      current => ({
        ...current,

        [match.id_partida]:
          match.clima || ''
      })
    )


    setSelectedWeather(
      current => ({
        ...current,

        [match.id_partida]:
          weatherOptions.filter(option =>
            match.clima
              ?.toLowerCase()
              .includes(
                option.toLowerCase()
              )
          )
      })
    )


    setEditingClimate(null)
    setError('')
  }


  return (

    <section className="mt-6 rounded-2xl border border-[#e5e7dd] bg-white p-6 sm:p-8">


      {/* CABEÇALHO */}

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


          {/* CADASTRAR PARTIDA */}

          {canManage && (

            <form
              onSubmit={submit}
              className="mt-7 rounded-xl border border-[#e0e5d4] bg-[#edf1e4] p-5"
            >

              <h3 className="font-display text-xl font-bold">
                Cadastrar partida
              </h3>


              <p className="mt-1 text-xs text-[#68765c]">

                Escolha dois times diferentes
                inscritos neste campeonato.

              </p>


              {teams.length < 2 ? (

                <div className="mt-5 rounded-lg bg-white p-4 text-sm text-[#747b70]">

                  É necessário ter pelo menos
                  dois times inscritos para
                  cadastrar uma partida.

                </div>

              ) : (

                <div className="mt-5">


                  <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">


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
                            value={team.id_time}
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
                            value={team.id_time}
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

                  </div>


                  <div className="mt-4 grid gap-4 sm:grid-cols-2">


                    <div>

                      <label
                        htmlFor="data_hora"
                        className="mb-2 block text-xs font-bold"
                      >
                        Data e Horário{' '}

                        <span className="text-[#829c38]">
                          *
                        </span>

                      </label>


                      <input
                        type="datetime-local"
                        id="data_hora"
                        className="arena-input"
                        value={dateTime}
                        disabled={saving}
                        required
                        onChange={event =>
                          setDateTime(
                            event.target.value
                          )
                        }
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
                        onChange={event =>
                          setLocation(
                            event.target.value
                          )
                        }
                      />

                    </div>

                  </div>

                </div>

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
                      : 'Cadastrar partida'
                    }


                    <ArrowRight className="size-4" />

                  </button>

                </div>

              )}

            </form>

          )}


          {/* MENSAGENS */}

          {error && (

            <p
              role="alert"
              className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-800"
            >
              {error}
            </p>

          )}


          {success && (

            <p
              role="status"
              className="mt-5 rounded-lg bg-[#f4f7ed] p-4 text-sm font-semibold text-[#68795c]"
            >
              {success}
            </p>

          )}


          {/* LISTAGEM */}

          <div className="mt-8">


            <div className="mb-4 flex items-center justify-between gap-4">

              <h3 className="font-display text-xl font-bold">
                Partidas cadastradas
              </h3>


              <span className="text-xs text-[#7d8378]">

                {matches.length}{' '}

                {matches.length === 1
                  ? 'partida'
                  : 'partidas'
                }

              </span>

            </div>


            {matches.length === 0 ? (

              <div className="arena-empty">

                <Trophy className="mx-auto mb-4 size-9 text-[#829c38]" />

                <h3 className="font-display text-xl font-bold">
                  Nenhuma partida cadastrada
                </h3>

              </div>

            ) : (

              <div className="grid gap-4">


                {matches.map(match => {

                  const isEditing =
                    editingClimate ===
                    match.id_partida


                  const selected =
                    selectedWeather[
                      match.id_partida
                    ] || []


                  return (

                    <div
                      key={match.id_partida}
                      className="overflow-hidden rounded-xl border border-[#e5e7dd] bg-white transition hover:border-[#829c38]"
                    >


                      {/* PARTIDA */}

                      <Link
                        href={`/partidas/${match.id_partida}`}
                        className="block p-5"
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


                        {(match.data_hora ||
                          match.local ||
                          match.clima) && (

                          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-[#e5e7dd] pt-3 text-xs text-[#7d8378]">


                            {match.data_hora && (

                              <span className="inline-flex items-center gap-1.5 font-semibold">

                                <CalendarDays className="size-4 text-[#829c38]" />

                                {new Date(
                                  match.data_hora
                                ).toLocaleString(
                                  'pt-BR',
                                  {
                                    dateStyle:
                                      'short',

                                    timeStyle:
                                      'short'
                                  }
                                )}

                              </span>

                            )}


                            {match.local && (

                              <span className="inline-flex items-center gap-1.5 font-semibold">

                                <MapPin className="size-4 text-[#829c38]" />

                                {match.local}

                              </span>

                            )}


                            {match.clima && (

                              <span className="inline-flex items-center gap-1.5 font-semibold">

                                <CloudSun className="size-4 text-[#829c38]" />

                                {match.clima}

                              </span>

                            )}

                          </div>

                        )}

                      </Link>


                      {/* ==================================================
                          CLIMA
                          ================================================== */}

                      {canManage && (

                        <div className="border-t border-[#e5e7dd] bg-[#fbfcf8] p-5">


                          <div className="flex items-center justify-between gap-4">


                            <div className="flex items-center gap-2">

                              <CloudSun className="size-5 text-[#829c38]" />

                              <h4 className="text-sm font-bold text-[#19382b]">
                                Condições climáticas
                              </h4>

                            </div>


                            {match.clima &&
                              !isEditing && (

                                <button
                                  type="button"
                                  className="inline-flex items-center gap-2 rounded-lg border border-[#d8ddce] bg-white px-4 py-2 text-xs font-bold text-[#19382b] transition hover:border-[#829c38]"
                                  onClick={() =>
                                    setEditingClimate(
                                      match.id_partida
                                    )
                                  }
                                >

                                  <Pencil className="size-4" />

                                  Editar clima

                                </button>

                              )}

                          </div>


                          {/* CLIMA JÁ CADASTRADO */}

                          {match.clima &&
                            !isEditing && (

                              <div className="mt-4 rounded-lg border border-[#e0e5d4] bg-white p-4">

                                <p className="text-sm font-semibold text-[#4f5d4c]">
                                  {match.clima}
                                </p>

                              </div>

                            )}


                          {/* FORMULÁRIO */}

                          {(!match.clima ||
                            isEditing) && (

                            <div className="mt-5">


                              {/* SUGESTÕES */}

                              <div>

                                <p className="mb-2 text-xs font-bold">
                                  Selecione até duas condições
                                </p>


                                <div className="flex flex-wrap gap-2">

                                  {weatherOptions.map(
                                    option => {

                                      const active =
                                        selected.includes(
                                          option
                                        )


                                      return (

                                        <button
                                          key={option}
                                          type="button"
                                          disabled={
                                            savingClimate ===
                                            match.id_partida
                                          }
                                          onClick={() =>
                                            toggleWeather(
                                              match.id_partida,
                                              option
                                            )
                                          }
                                          className={
                                            active

                                              ? 'inline-flex items-center gap-1.5 rounded-full border border-[#829c38] bg-[#edf1e4] px-3 py-2 text-xs font-bold text-[#19382b]'

                                              : 'inline-flex items-center gap-1.5 rounded-full border border-[#dfe3d8] bg-white px-3 py-2 text-xs font-semibold text-[#667064] transition hover:border-[#829c38]'
                                          }
                                        >

                                          {active && (
                                            <Check className="size-3.5" />
                                          )}

                                          {option}

                                        </button>

                                      )

                                    }
                                  )}

                                </div>


                                <p className="mt-2 text-[11px] text-[#7d8378]">

                                  Exemplo:
                                  Nublado + Ventando.

                                </p>

                              </div>


                              {/* DESCRIÇÃO */}

                              <div className="mt-5">

                                <label
                                  htmlFor={`clima-${match.id_partida}`}
                                  className="mb-2 block text-xs font-bold"
                                >
                                  Descrição
                                </label>


                                <input
                                  id={`clima-${match.id_partida}`}
                                  type="text"
                                  className="arena-input"
                                  maxLength={150}
                                  placeholder="Ex.: Nublado, Ventando, 22°C"
                                  value={
                                    weatherValues[
                                      match.id_partida
                                    ] || ''
                                  }
                                  disabled={
                                    savingClimate ===
                                    match.id_partida
                                  }
                                  onChange={event =>
                                    setWeatherValues(
                                      current => ({
                                        ...current,

                                        [match.id_partida]:
                                          event.target.value
                                      })
                                    )
                                  }
                                />


                                <p className="mt-1 text-[11px] text-[#7d8378]">

                                  Você também pode
                                  complementar com
                                  temperatura ou outra
                                  observação.

                                </p>

                              </div>


                              {/* BOTÕES */}

                              <div className="mt-5 flex flex-wrap justify-end gap-3">


                                {match.clima &&
                                  isEditing && (

                                    <button
                                      type="button"
                                      disabled={
                                        savingClimate !== null
                                      }
                                      className="inline-flex items-center gap-2 rounded-lg border border-[#d8ddce] bg-white px-4 py-2.5 text-sm font-bold text-[#19382b]"
                                      onClick={() =>
                                        cancelClimateEdit(
                                          match
                                        )
                                      }
                                    >

                                      <X className="size-4" />

                                      Cancelar

                                    </button>

                                  )}


                                <button
                                  type="button"
                                  className="arena-primary"
                                  disabled={
                                    savingClimate !== null
                                  }
                                  onClick={() =>
                                    void saveClimate(
                                      match.id_partida
                                    )
                                  }
                                >

                                  <Save className="size-4" />


                                  {savingClimate ===
                                  match.id_partida

                                    ? 'Salvando...'

                                    : match.clima
                                      ? 'Salvar alterações'
                                      : 'Salvar clima'
                                  }

                                </button>

                              </div>

                            </div>

                          )}

                        </div>

                      )}

                    </div>

                  )

                })}

              </div>

            )}

          </div>

        </>

      )}

    </section>

  )
}