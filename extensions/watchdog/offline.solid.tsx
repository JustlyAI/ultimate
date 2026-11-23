import { WifiOffIcon } from '@lucide/solid'
import { renderEntry } from '@/sdk/solid'
import { OfflineEntry } from './entries.ts'

export const Offline = renderEntry(OfflineEntry, (props) => (
  <p class="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
    <WifiOffIcon class="size-3.5" />
    waiting for network: {props.entry.data.host} unreachable; continues once it is back
  </p>
))
