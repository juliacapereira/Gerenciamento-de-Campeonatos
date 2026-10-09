"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/hooks/use-admin";

type AdminGuardProps = {
  children: React.ReactNode;
};

export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const { isAdmin, carregando } = useAdmin();

  useEffect(() => {
    if (!carregando && !isAdmin) {
      router.replace("/admin/login");
    }
  }, [carregando, isAdmin, router]);

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbfbf8]">
        <p className="text-sm font-semibold text-[#536548]">
          Verificando acesso...
        </p>
      </main>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
}