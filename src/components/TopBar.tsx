type Props = { panelOpen: boolean; onTogglePanel: () => void }

export default function TopBar({ panelOpen, onTogglePanel }: Props) {
  return (
    <header className="topbar">
      <strong className="brand">Vela</strong>
      <span className="topbar-hint">Busca de ativo e intervalos chegam na próxima fase</span>
      <button className="btn" onClick={onTogglePanel}>
        {panelOpen ? 'Esconder painel' : 'Mostrar painel'}
      </button>
    </header>
  )
}
