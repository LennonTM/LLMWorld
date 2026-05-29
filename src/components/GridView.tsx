import { letterAt, adjacentToDoor, key } from '../game/engine'
import type { GameState, Pos } from '../game/types'

interface Props {
  state: GameState
}

export function GridView({ state }: Props) {
  const wallSet = new Set(state.walls)
  const cells: React.ReactNode[] = []
  const near = adjacentToDoor(state)

  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const p: Pos = { x, y }
      const isAgent = state.agent.x === x && state.agent.y === y
      const isDoor = state.door.x === x && state.door.y === y
      const isWall = wallSet.has(key(p))
      const lt = letterAt(state, p)

      let cls = 'cell'
      let content: React.ReactNode = ''
      if (isWall) {
        cls += ' wall'
      } else if (isDoor) {
        cls += state.unlocked ? ' door open' : ' door'
        content = state.unlocked ? '✓' : '🚪'
      } else if (lt) {
        cls += ' letter'
        content = lt.char
      }
      if (isAgent) {
        cls += ' agent'
        content = lt ? <span className="agent-on-letter">{lt.char}</span> : '🤖'
      }

      cells.push(
        <div key={`${x},${y}`} className={cls} title={`(${x}, ${y})`}>
          {content}
        </div>,
      )
    }
  }

  return (
    <div className="grid-wrap">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${state.width}, var(--cell))`,
          gridTemplateRows: `repeat(${state.height}, var(--cell))`,
        }}
      >
        {cells}
      </div>
      <div className="door-word">
        Door:{' '}
        {near || state.unlocked ? (
          <strong>{state.door.word}</strong>
        ) : (
          <em>??? (Claude must get closer to read it)</em>
        )}
      </div>
    </div>
  )
}
