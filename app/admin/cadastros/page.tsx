import { redirect } from 'next/navigation'

// O cadastro antigo foi substituído pelas páginas /times e /jogadores.
export default function Page() {
  redirect('/jogadores')
}