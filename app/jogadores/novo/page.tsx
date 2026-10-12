import { PlayerForm } from "@/components/arena/jogadores";
import { AdminGuard } from "@/components/auth/admin-guard";

export const metadata = {
  title: "Cadastrar jogador — Arena Local",
};

export default function Page() {
  return (
    <AdminGuard>
      <PlayerForm />
    </AdminGuard>
  );
}