import { defineEntry } from '@earendil-works/pi-durable'
import type { Failure, Offline } from './refs.ts'

export const FailureEntry = defineEntry<Failure>('watchdog.failure')

export const OfflineEntry = defineEntry<Offline>('watchdog.offline')

export const IdleEntry = defineEntry<{ text: string }>('watchdog.idle')
