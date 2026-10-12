import { ManagementForm } from "@/components/arena/management";
import { AdminGuard } from "@/components/auth/admin-guard";

export default function Page() {
  return (
    <AdminGuard>
      <ManagementForm kind="times" />
    </AdminGuard>
  );
}