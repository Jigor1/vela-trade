export default function SidePanel({ onClose }: { onClose: () => void }) {
  return (
    <aside className="side-panel">
      <div className="side-header">
        <span>Painel</span>
        <button className="btn" onClick={onClose} aria-label="Fechar painel">
          ×
        </button>
      </div>
      <p className="muted">Notas, revisões e carteira aparecerão aqui nas próximas fases.</p>
    </aside>
  )
}
