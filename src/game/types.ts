export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Pos {
  x: number
  y: number
}

export interface LetterTile extends Pos {
  char: string
}

export interface DoorTile extends Pos {
  /** The word that must be spelled (collected) to unlock this door. */
  word: string
}

export interface Level {
  id: string
  name: string
  width: number
  height: number
  /** Wall tiles (impassable). */
  walls: Pos[]
  /** Agent starting position. */
  start: Pos
  door: DoorTile
  letters: LetterTile[]
  hint?: string
}

export interface GameState {
  levelId: string
  name: string
  width: number
  height: number
  /** Encoded "x,y" wall positions for O(1) lookup. */
  walls: string[]
  agent: Pos
  door: DoorTile
  letters: LetterTile[]
  /** Letters Claude is currently carrying. */
  inventory: string[]
  unlocked: boolean
  won: boolean
  steps: number
  hint?: string
}

export interface ActionResult {
  ok: boolean
  message: string
}
