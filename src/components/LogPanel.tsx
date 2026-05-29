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
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  return (
    <div className="panel log">
      <h2>Claude's activity</h2>
      <div className="log-list">
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
        <div ref={endRef} />
      </div>
    </div>
  )
}
