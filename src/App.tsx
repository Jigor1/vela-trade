import { useState } from 'react'
import TopBar from './components/TopBar'
import ChartArea from './components/ChartArea'
import SidePanel from './components/SidePanel'

export default function App() {
  const [panelOpen, setPanelOpen] = useState(true)

  return (
    <div className="app">
      <TopBar panelOpen={panelOpen} onTogglePanel={() => setPanelOpen((v) => !v)} />
      <div className="main">
        <ChartArea />
        {panelOpen && <SidePanel onClose={() => setPanelOpen(false)} />}
      </div>
    </div>
  )
}
