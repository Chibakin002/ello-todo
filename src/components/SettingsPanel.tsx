import { useState, useEffect } from 'react'
import { useAppStore, defaultSettings } from '../store'
import { db } from '../db'

export function SettingsPanel() {
  const settings = useAppStore(s => s.settings)
  const updateSettings = useAppStore(s => s.updateSettings)
  const loadFromDb = useAppStore(s => s.loadFromDb)
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('momentum-theme')
    if (saved) return saved as 'light' | 'dark'
    return 'dark'
  })

  useEffect(() => {
    localStorage.setItem('momentum-theme', theme)
    if (theme === 'dark') document.body.classList.add('dark')
    else document.body.classList.remove('dark')
  }, [theme])

  function toggleTheme() {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  async function exportData() {
    const tasks = await db.tasks.toArray()
    const sessions = await db.sessions.toArray()
    const state = useAppStore.getState()
    const exportObj = {
      tasks,
      sessions,
      state: {
        settings: state.settings,
        xp: state.xp,
        level: state.level,
        lastDailyCheckKey: state.lastDailyCheckKey
      }
    }
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `momentum-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.tasks) {
          await db.tasks.clear()
          await db.sessions.clear()
          await db.tasks.bulkAdd(data.tasks)
          if(data.sessions) await db.sessions.bulkAdd(data.sessions)
          
          if (data.state) {
            useAppStore.setState({
               settings: data.state.settings || defaultSettings,
               xp: data.state.xp || 0,
               level: data.state.level || 1,
               lastDailyCheckKey: data.state.lastDailyCheckKey || null,
            })
          }
          await loadFromDb()
          alert('Data imported successfully!')
        }
      } catch (err) {
        alert('Failed to import data.')
        console.error(err)
      }
    }
    reader.readAsText(file)
  }

  return (
    <section className="card settings-card">
      <div className="card-head">
        <h2>Settings</h2>
        <button type="button" className="mini-btn soft-btn" onClick={toggleTheme}>
          {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
      </div>
      
      <div className="settings-grid">
        <label>
          Sprint length (min)
          <input type="number" min={5} max={90} value={settings.sprintMinutes} onChange={(e) => updateSettings({ sprintMinutes: Number(e.target.value) || defaultSettings.sprintMinutes })} />
        </label>
        
        <label>
          Short break (min)
          <input type="number" min={1} max={30} value={settings.shortBreakMinutes} onChange={(e) => updateSettings({ shortBreakMinutes: Number(e.target.value) || defaultSettings.shortBreakMinutes })} />
        </label>
        
        <label>
          Long break (min)
          <input type="number" min={5} max={60} value={settings.longBreakMinutes} onChange={(e) => updateSettings({ longBreakMinutes: Number(e.target.value) || defaultSettings.longBreakMinutes })} />
        </label>
      </div>

      <div className="data-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button type="button" className="soft-btn" onClick={exportData}>Export Data</button>
        <label className="btn soft-btn" style={{ cursor: 'pointer', textAlign: 'center', flex: 1 }}>
          Import Data
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </label>
      </div>
    </section>
  )
}
