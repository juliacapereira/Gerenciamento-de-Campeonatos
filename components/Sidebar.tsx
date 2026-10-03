import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-[#112d21] text-emerald-100 flex flex-col h-screen p-4 border-r border-[#1c3b2c]">
      {/* LOGO / TÍTULO NO SIDEBAR */}
      <div className="text-xl font-bold text-white mb-8 px-2 tracking-wide flex items-center gap-2.5">
        <span className="w-3.5 h-3.5 rounded-full bg-[#d7f36a] shadow-sm"></span>
        <span>Gestão de Torneios</span>
      </div>

      <nav className="flex flex-col space-y-2 flex-1">
        <Link 
          href="/" 
          className="px-3 py-2.5 rounded-lg hover:bg-[#1b392b] hover:text-white transition font-medium"
        >
          Página Inicial
        </Link>
        
        <Link 
          href="/admin/cadastros" 
          className="px-3 py-2.5 rounded-lg hover:bg-[#1b392b] hover:text-white transition font-medium"
        >
          Gerenciar Cadastros
        </Link>

        {/* Futuras secções planeadas para o sistema */}
        <Link 
          href="/admin/campeonatos" 
          className="px-3 py-2.5 rounded-lg hover:bg-[#1b392b]/50 transition font-medium text-emerald-300/60"
        >
          Campeonatos <span className="text-xs bg-[#1b392b] text-emerald-300 px-1.5 py-0.5 rounded ml-1">Em breve</span>
        </Link>
      </nav>

      <div className="pt-4 border-t border-[#1c3b2c] text-xs text-emerald-400/60 px-2">
        Painel Administrativo
      </div>
    </aside>
  );
}