/** Watchdog entries: failure cards, and the note that a run waits for its provider's host to be reachable again. */
import type { ConversationId } from '@earendil-works/pi-durable'
/** A failed run's provider host was unreachable at `since` (epoch ms); the run continues once it is reachable. */
export type Offline = { host: string; since: number }
export type Failure = {
  conversation: ConversationId
  title: string
  error: string
  step: string
  hint?: string
  retried: boolean
  /** How many automatic continuations ran before this report, when more than one. */
  retries?: number
}
