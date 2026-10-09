import { ManagementForm } from "@/components/arena/management";
import { AdminGuard } from "@/components/auth/admin-guard";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminGuard>
      <ManagementForm
        key={id}
        kind="campeonatos"
        id={id}
      />
    </AdminGuard>
  );
}