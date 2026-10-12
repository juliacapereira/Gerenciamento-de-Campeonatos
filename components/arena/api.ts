// Chamada à API usada pelos componentes de elenco e jogadores (mesmo comportamento de management.tsx).
export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/${path}`, { cache: 'no-store', ...options })
  let data
  try { data = await response.json() } catch { throw new Error('Não foi possível conectar à API. Verifique se o backend está em execução.') }
  if (!response.ok) throw new Error(data.erro || 'Não foi possível concluir a operação.')
  return data
}
