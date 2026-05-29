import { useEffect, useRef } from 'react'
import type { LogEntry } from '../useLLMWorld'

const ICON: Record<LogEntry['kind'], string> = {
  thought: '💭',
  say: '💬',
  action: '✅',
  fail: '⚠️',
  win: '🎉',
  error: '❌',
  system: 'ℹ️',
}

export function LogPanel({ log }: { log: LogEntry[] }) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll the log container itself, not the page — keeps the map in view.
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [log])

  return (
    <div className="panel log">
      <h2>Claude's activity</h2>
      <div className="log-list" ref={listRef}>
        {log.length === 0 && (
          <p className="empty">
            Press <strong>Run Claude</strong> or <strong>Step</strong> to begin.
            Claude's reasoning and each action will appear here.
          </p>
        )}
        {log.map((e) => (
          <div key={e.id} className={`log-entry ${e.kind}`}>
            <span className="log-icon">{ICON[e.kind]}</span>
            <span className="log-text">{e.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
