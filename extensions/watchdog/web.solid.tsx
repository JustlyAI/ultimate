import { attention, defineWebExtension } from '@/sdk/solid'
import { Failure, StandingFailure } from './failure.solid.tsx'
import { Idle } from './idle.solid.tsx'
import { Offline } from './offline.solid.tsx'

export default defineWebExtension({
  entries: {
    'watchdog.failure': Failure,
    'watchdog.standing-failure': attention(StandingFailure),
    'watchdog.offline': Offline,
    'watchdog.idle': Idle,
  },
})
