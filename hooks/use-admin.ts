"use client";

import { useEffect, useState } from "react";

type Usuario = {
  id: string;
  nome: string;
  email: string;
};

export function useAdmin() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function verificar() {
      try {
        const resposta = await fetch("/api/admin/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!resposta.ok) {
          setUsuario(null);
          return;
        }

        const dados = await resposta.json();
        setUsuario(dados.usuario);
      } catch {
        setUsuario(null);
      } finally {
        setCarregando(false);
      }
    }

    verificar();
  }, []);

  return {
    usuario,
    carregando,
    isAdmin: !!usuario,
  };
}