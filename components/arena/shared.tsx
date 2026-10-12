'use client'

// Peças visuais usadas pela página do jogador e pela seção de elenco do time.
import { useState } from 'react'

export const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()

export function Avatar({ player, className = 'size-14' }: { player: { nome: string; foto_url?: string | null }; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (player.foto_url && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={player.foto_url} alt={`Foto de ${player.nome}`} onError={() => setFailed(true)} className={`${className} shrink-0 rounded-full border border-[#e5e7dd] bg-[#f1f2eb] object-cover`} />
  }
  return <div aria-hidden="true" className={`${className} flex shrink-0 items-center justify-center rounded-full bg-[#eef1e5] text-sm font-extrabold text-[#5b7425]`}>{initials(player.nome) || '?'}</div>
}

// A posição vem como texto ("Ala, Pivô"); cada posição vira uma etiqueta.
export function PositionChips({ value }: { value?: string | null }) {
  const items = (value ?? '').split(',').map(item => item.trim()).filter(Boolean)
  if (!items.length) return <span className="text-xs text-[#7d8378]">Posição não definida</span>
  return <ul aria-label="Posições" className="flex flex-wrap gap-1.5">{items.map(item => <li key={item} className="rounded-full bg-[#eef1e5] px-2.5 py-1 text-xs font-bold text-[#5b7425]">{item}</li>)}</ul>
}
