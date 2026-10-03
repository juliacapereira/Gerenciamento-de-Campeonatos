import { PlayerForm } from '@/components/arena/jogadores'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PlayerForm key={id} id={id} />
}