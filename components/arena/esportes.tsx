'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, Plus, Trophy, ShieldCheck } from 'lucide-react'

import { Header, Footer } from './arena-home'
import { request } from './api'
import { useAdmin } from '@/hooks/use-admin'

type Sport = {
  id_esporte: number
  nome: string
  descricao?: string | null
}

export function SportsManager() {
  const { isAdmin, carregando } = useAdmin()

  const [sports, setSports] = useState<Sport[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    setLoadError('')

    try {
      setSports(await request<Sport[]>('esportes'))
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'Erro ao carregar esportes.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // Segurança adicional no frontend.
    if (!isAdmin) {
      setError('Apenas administradores podem cadastrar esportes.')
      return
    }

    if (saving) return

    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const result = await request<{ mensagem: string }>(
        'esportes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nome: nome.trim(),
            descricao: descricao.trim(),
          }),
        }
      )

      setSuccess(result.mensagem)
      setNome('')
      setDescricao('')

      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao salvar o esporte.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Header />

      <main className="section-wrap min-h-[70vh] py-10 sm:py-14">

        {/* CABEÇALHO */}
        <div className="organizer-panel relative mb-8 overflow-hidden rounded-2xl bg-[#19382b] p-6 text-white sm:p-9">
          <div className="flex items-center justify-between gap-6">

            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-[#d7f36a]">
                Modalidades
              </p>

              <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
                Esportes
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
                Consulte as modalidades disponíveis para os
                campeonatos da comunidade.
              </p>
            </div>

            <Trophy
              aria-hidden="true"
              className="hidden size-20 shrink-0 text-[#d7f36a]/70 sm:block"
            />
          </div>
        </div>


        <div
          className={
            isAdmin
              ? 'grid items-start gap-6 lg:grid-cols-[1fr_340px]'
              : 'grid items-start gap-6 lg:grid-cols-[1fr_340px]'
          }
        >

          {/* ÁREA ADMINISTRATIVA */}
          {carregando ? (
            <div className="rounded-2xl border border-[#e5e7dd] bg-white p-6 sm:p-8">
              <p className="text-sm text-[#68765c]">
                Verificando permissões...
              </p>
            </div>
          ) : isAdmin ? (

            <form
              onSubmit={submit}
              className="rounded-2xl border border-[#e5e7dd] bg-white p-6 sm:p-8"
            >
              <div className="mb-7 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold">
                    Novo esporte
                  </h2>

                  <p className="mt-2 text-xs text-[#7d8378]">
                    Os campos com * são obrigatórios.
                  </p>
                </div>

                <span className="flex items-center gap-1.5 rounded-full bg-[#edf1e4] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#56653f]">
                  <ShieldCheck className="size-3.5" />
                  Administrador
                </span>
              </div>

              <fieldset
                disabled={saving}
                className="grid gap-5"
              >

                <div>
                  <label
                    htmlFor="nome"
                    className="mb-2 block text-xs font-bold"
                  >
                    Nome do esporte
                    <span className="text-[#829c38]"> *</span>
                  </label>

                  <input
                    id="nome"
                    name="nome"
                    className="arena-input"
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="Ex.: Handebol"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>


                <div>
                  <label
                    htmlFor="descricao"
                    className="mb-2 block text-xs font-bold"
                  >
                    Descrição
                  </label>

                  <textarea
                    id="descricao"
                    name="descricao"
                    className="arena-input min-h-28 resize-y"
                    rows={4}
                    maxLength={5000}
                    placeholder="Parâmetros básicos: número de jogadores, duração, observações..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                  />
                </div>


                {error && (
                  <p
                    role="alert"
                    className="rounded-lg bg-red-50 p-4 text-sm text-red-800"
                  >
                    {error}
                  </p>
                )}


                {success && (
                  <p
                    role="status"
                    className="flex items-center gap-2 rounded-lg bg-[#edf1e4] p-4 text-sm text-[#40502f]"
                  >
                    <CheckCircle2 className="size-4" />
                    {success}
                  </p>
                )}


                <div className="flex justify-end border-t border-[#e5e7dd] pt-5">
                  <button
                    type="submit"
                    className="arena-primary"
                    disabled={
                      saving ||
                      nome.trim().length < 2
                    }
                  >
                    <Plus className="size-4" />

                    {saving
                      ? 'Salvando...'
                      : 'Cadastrar esporte'}
                  </button>
                </div>

              </fieldset>
            </form>

          ) : (

            /* VISITANTE */
            <div className="rounded-2xl border border-[#e5e7dd] bg-white p-6 sm:p-8">

              <h2 className="font-display text-2xl font-bold text-[#20372b]">
                Modalidades disponíveis
              </h2>

              <p className="mt-3 max-w-lg text-sm leading-6 text-[#747b70]">
                Os esportes cadastrados podem ser consultados
                por qualquer pessoa.
              </p>

              <p className="mt-4 text-xs font-semibold text-[#829c38]">
                O cadastro de novas modalidades é exclusivo
                para administradores.
              </p>

            </div>
          )}


          {/* LISTAGEM PÚBLICA */}
          <aside className="rounded-2xl border border-[#e0e5d4] bg-[#edf1e4] p-6">

            <h2 className="font-display text-xl font-bold">
              Esportes cadastrados
            </h2>

            {loading ? (
              <p
                role="status"
                className="mt-4 text-sm text-[#68765c]"
              >
                Carregando...
              </p>

            ) : loadError ? (

              <div
                role="alert"
                className="mt-4 text-sm text-red-800"
              >
                {loadError}

                <button
                  type="button"
                  className="mt-2 block underline"
                  onClick={load}
                >
                  Tentar novamente
                </button>
              </div>

            ) : sports.length === 0 ? (

              <p className="mt-4 text-sm text-[#68765c]">
                Nenhum esporte cadastrado ainda.
              </p>

            ) : (

              <ul className="mt-4 grid gap-3">
                {sports.map((sport) => (
                  <li
                    key={sport.id_esporte}
                    className="rounded-lg bg-white p-3"
                  >
                    <p className="font-semibold">
                      {sport.nome}
                    </p>

                    {sport.descricao && (
                      <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-[#747b70]">
                        {sport.descricao}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}

          </aside>

        </div>
      </main>

      <Footer />
    </>
  )
}