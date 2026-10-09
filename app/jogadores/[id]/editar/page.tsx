import { PlayerForm } from "@/components/arena/jogadores";
import { AdminGuard } from "@/components/auth/admin-guard";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminGuard>
      <PlayerForm
        key={id}
        id={id}
      />
    </AdminGuard>
  );
}