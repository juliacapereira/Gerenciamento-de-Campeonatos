import { ManagementDetail } from '@/components/arena/management'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ManagementDetail key={id} kind="times" id={id} />
}
