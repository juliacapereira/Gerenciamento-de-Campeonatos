import { PlayerDetail } from '@/components/arena/jogadores'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PlayerDetail key={id} id={id} />
}