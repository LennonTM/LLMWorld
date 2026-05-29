import { LEVELS } from '../game/levels'
import { MODELS, type Config } from '../useLLMWorld'
import type { GameState } from '../game/types'
import type { Usage } from '../agent/client'

interface Props {
  state: GameState
  levelId: string
  running: boolean
  busy: boolean
  config: Config
  usage: Usage | null
  keyOk: boolean | null
  setConfig: (c: Config) => void
  start: () => void
  pause: () => void
  step: () => void
  reset: (id?: string) => void
}

export function ControlPanel(p: Props) {
  const { state, config, setConfig } = p

  return (
    <div className="panel controls">
      <h2>Controls</h2>

      {p.keyOk === false && (
        <div className="warn">
          No <code>ANTHROPIC_API_KEY</code> found on the server. Add it to{' '}
          <code>.env</code> and restart.
        </div>
      )}

      <div className="row buttons">
        {!p.running ? (
          <button className="primary" onClick={p.start} disabled={state.won || p.busy}>
            ▶ Run Claude
          </button>
        ) : (
          <button className="primary" onClick={p.pause}>
            ⏸ Pause
          </button>
        )}
        <button onClick={p.step} disabled={p.running || state.won || p.busy}>
          ⏭ Step
        </button>
        <button onClick={() => p.reset()}>↺ Reset</button>
      </div>

      <label className="field">
        <span>Level</span>
        <select
          value={p.levelId}
          onChange={(e) => p.reset(e.target.value)}
        >
          {LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Model</span>
        <select
          value={config.model}
          onChange={(e) => setConfig({ ...config, model: e.target.value })}
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Effort</span>
        <select
          value={config.effort}
          onChange={(e) =>
            setConfig({ ...config, effort: e.target.value as Config['effort'] })
          }
        >
          <option value="low">low (snappy)</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="max">max (Opus only)</option>
        </select>
      </label>

      <label className="field">
        <span>Step delay: {config.delayMs} ms</span>
        <input
          type="range"
          min={0}
          max={2500}
          step={100}
          value={config.delayMs}
          onChange={(e) =>
            setConfig({ ...config, delayMs: Number(e.target.value) })
          }
        />
      </label>

      <div className="stats">
        <div>
          <span>Steps</span>
          <strong>{state.steps}</strong>
        </div>
        <div>
          <span>Inventory</span>
          <strong>{state.inventory.join(' ') || '—'}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong className={state.won ? 'good' : ''}>
            {state.won ? 'Solved 🎉' : p.busy ? 'Thinking…' : p.running ? 'Running' : 'Idle'}
          </strong>
        </div>
      </div>

      {usageLine(p.usage)}

      {state.hint && <p className="hint">💡 {state.hint}</p>}
    </div>
  )
}

function usageLine(usage: Usage | null) {
  if (!usage) return null
  const cached = usage.cache_read_input_tokens ?? 0
  return (
    <p className="usage">
      last turn · in {usage.input_tokens} (cached {cached}) · out{' '}
      {usage.output_tokens}
    </p>
  )
}
