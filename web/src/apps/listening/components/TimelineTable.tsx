import type { TimelineEntry } from '../types'
import { formatTime } from '../services/audioEncoder'

interface TimelineTableProps {
  timeline: TimelineEntry[]
}

const ROLE_LABEL: Record<string, string> = {
  female: 'W',
  male: 'M',
  chinese: '中文',
  narrator: '短文',
}

export function TimelineTable({ timeline }: TimelineTableProps) {
  if (!timeline.length) return null

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="pb-2 pr-3 w-16">时间</th>
            <th className="pb-2 pr-3 w-16">角色</th>
            <th className="pb-2">内容</th>
          </tr>
        </thead>
        <tbody>
          {timeline.map((entry, i) => {
            if (entry.kind === 'header') {
              return (
                <tr key={i} className="bg-muted/20">
                  <td colSpan={3} className="px-2 py-1.5 font-semibold text-foreground text-xs">
                    {entry.label}
                  </td>
                </tr>
              )
            }
            const role = ROLE_LABEL[entry.role] || entry.role
            const repMark = entry.totalReps > 1 ? ` (第${entry.rep}遍)` : ''
            return (
              <tr key={i} className="border-b border-border/50">
                <td className="py-1.5 pr-3 font-metric text-emerald-400 whitespace-nowrap">
                  {formatTime(entry.timestamp)}
                </td>
                <td className="py-1.5 pr-3 text-muted-foreground whitespace-nowrap">
                  {role}{repMark}
                </td>
                <td className="py-1.5 text-foreground">{entry.text}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
