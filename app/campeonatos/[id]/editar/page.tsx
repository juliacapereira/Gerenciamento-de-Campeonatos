import { ManagementForm } from '@/components/arena/management'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ManagementForm key={id} kind="campeonatos" id={id} />
}
