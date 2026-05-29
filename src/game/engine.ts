import type {
  ActionResult,
  Direction,
  GameState,
  Level,
  Pos,
} from './types'

export const key = (p: Pos) => `${p.x},${p.y}`

const DELTA: Record<Direction, Pos> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export function createState(level: Level): GameState {
  return {
    levelId: level.id,
    name: level.name,
    width: level.width,
    height: level.height,
    walls: level.walls.map(key),
    agent: { ...level.start },
    door: { ...level.door },
    letters: level.letters.map((l) => ({ ...l })),
    inventory: [],
    unlocked: false,
    won: false,
    steps: 0,
    hint: level.hint,
  }
}

const isWall = (s: GameState, p: Pos) => s.walls.includes(key(p))
const isDoor = (s: GameState, p: Pos) => s.door.x === p.x && s.door.y === p.y
const inBounds = (s: GameState, p: Pos) =>
  p.x >= 0 && p.y >= 0 && p.x < s.width && p.y < s.height

export const letterAt = (s: GameState, p: Pos) =>
  s.letters.find((l) => l.x === p.x && l.y === p.y)

/** Orthogonally adjacent to the door (close enough to read / unlock it). */
export function adjacentToDoor(s: GameState): boolean {
  return Object.values(DELTA).some((d) => {
    const p = { x: s.agent.x + d.x, y: s.agent.y + d.y }
    return isDoor(s, p)
  })
}

/** Does `inventory` contain enough of each letter to spell `word`? */
export function canSpell(inventory: string[], word: string): boolean {
  const need = new Map<string, number>()
  for (const ch of word.toUpperCase().replace(/[^A-Z]/g, '')) {
    need.set(ch, (need.get(ch) ?? 0) + 1)
  }
  const have = new Map<string, number>()
  for (const ch of inventory) have.set(ch, (have.get(ch) ?? 0) + 1)
  for (const [ch, n] of need) {
    if ((have.get(ch) ?? 0) < n) return false
  }
  return true
}

export function applyMove(
  s: GameState,
  dir: Direction,
): { state: GameState; result: ActionResult } {
  const target = { x: s.agent.x + DELTA[dir].x, y: s.agent.y + DELTA[dir].y }
  if (!inBounds(s, target)) {
    return fail(s, `You can't move ${dir} — that's the edge of the world.`)
  }
  if (isWall(s, target)) {
    return fail(s, `You can't move ${dir} — there is a wall there.`)
  }
  if (isDoor(s, target)) {
    return fail(
      s,
      `You can't move ${dir} — the door blocks the way. Stand next to it and use unlock.`,
    )
  }
  const next: GameState = { ...s, agent: target, steps: s.steps + 1 }
  const lt = letterAt(next, target)
  const note = lt
    ? ` You are now standing on the letter "${lt.char}". Use pick_up to collect it.`
    : ''
  return ok(next, `Moved ${dir} to (${target.x}, ${target.y}).${note}`)
}

export function applyPickUp(s: GameState): {
  state: GameState
  result: ActionResult
} {
  const lt = letterAt(s, s.agent)
  if (!lt) {
    return fail(s, 'There is no letter on your current tile to pick up.')
  }
  const next: GameState = {
    ...s,
    inventory: [...s.inventory, lt.char],
    letters: s.letters.filter((l) => !(l.x === lt.x && l.y === lt.y)),
    steps: s.steps + 1,
  }
  return ok(
    next,
    `Picked up "${lt.char}". Inventory: [${next.inventory.join(', ')}].`,
  )
}

export function applyDrop(
  s: GameState,
  letter: string,
): { state: GameState; result: ActionResult } {
  const ch = (letter ?? '').toUpperCase().slice(0, 1)
  const idx = s.inventory.indexOf(ch)
  if (idx === -1) {
    return fail(
      s,
      `You are not carrying "${ch}". Inventory: [${s.inventory.join(', ')}].`,
    )
  }
  if (letterAt(s, s.agent)) {
    return fail(s, 'This tile already holds a letter — each tile can hold only one.')
  }
  if (isDoor(s, s.agent)) {
    return fail(s, 'You cannot drop a letter onto the door tile.')
  }
  const inv = [...s.inventory]
  inv.splice(idx, 1)
  const next: GameState = {
    ...s,
    inventory: inv,
    letters: [...s.letters, { x: s.agent.x, y: s.agent.y, char: ch }],
    steps: s.steps + 1,
  }
  return ok(
    next,
    `Dropped "${ch}" at (${s.agent.x}, ${s.agent.y}). Inventory: [${inv.join(', ')}].`,
  )
}

export function applyUnlock(s: GameState): {
  state: GameState
  result: ActionResult
} {
  if (!adjacentToDoor(s)) {
    return fail(s, 'You must be standing next to the door to unlock it.')
  }
  if (!canSpell(s.inventory, s.door.word)) {
    return fail(
      s,
      `The door stays locked. You need the letters of "${s.door.word}" in your inventory. You are carrying [${s.inventory.join(', ')}].`,
    )
  }
  const next: GameState = {
    ...s,
    unlocked: true,
    won: true,
    steps: s.steps + 1,
  }
  return ok(
    next,
    `🎉 The door unlocks! You spelled "${s.door.word}". Level complete in ${next.steps} steps.`,
  )
}

function ok(state: GameState, message: string) {
  return { state, result: { ok: true, message } }
}
function fail(state: GameState, message: string) {
  // A failed action still costs nothing structurally, but we keep the state.
  return { state, result: { ok: false, message } }
}

/**
 * A textual observation Claude reads each turn: an ASCII map plus structured
 * facts. The door's word is only revealed when Claude is standing next to it.
 */
export function buildObservation(s: GameState): string {
  const rows: string[] = []
  for (let y = 0; y < s.height; y++) {
    let row = ''
    for (let x = 0; x < s.width; x++) {
      const p = { x, y }
      if (s.agent.x === x && s.agent.y === y) row += '@'
      else if (isDoor(s, p)) row += 'D'
      else if (isWall(s, p)) row += '#'
      else {
        const lt = letterAt(s, p)
        row += lt ? lt.char : '.'
      }
    }
    rows.push(row)
  }

  const near = adjacentToDoor(s)
  const doorLine = near
    ? `You are next to the door. The word carved on it reads: "${s.door.word}". Spell it to unlock.`
    : `A door is at (${s.door.x}, ${s.door.y}). You must stand next to it to read the word carved on it.`

  const lettersLine = s.letters.length
    ? s.letters
        .map((l) => `"${l.char}" at (${l.x}, ${l.y})`)
        .join(', ')
    : 'none remaining on the ground'

  const standing = letterAt(s, s.agent)

  return [
    `=== OBSERVATION (step ${s.steps}) ===`,
    'Map (x increases right, y increases down):',
    rows.join('\n'),
    '',
    'Legend: @ = you, # = wall, D = door, A-Z = a letter on the ground, . = floor.',
    `You are at (${s.agent.x}, ${s.agent.y}).` +
      (standing ? ` There is a letter "${standing.char}" on your tile.` : ''),
    `Inventory (letters you carry): [${s.inventory.join(', ') || 'empty'}].`,
    `Letters on the ground: ${lettersLine}.`,
    doorLine,
    s.won ? 'STATUS: This level is COMPLETE.' : 'STATUS: door is locked.',
  ].join('\n')
}
