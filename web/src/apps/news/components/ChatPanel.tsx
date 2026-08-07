import { useState, useCallback } from 'react'
import { MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { useChat } from '../useChat'
import { usePreferences } from '../usePreferences'
import type { PreferenceDoc } from '../api'

interface ChatPanelProps {
  token: string
  keywords: string[]
  onPreferenceUpdated?: () => void
}

export function ChatPanel({ token, keywords, onPreferenceUpdated }: ChatPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [scope, setScope] = useState<string>('') // '' = global
  const [input, setInput] = useState('')

  const chat = useChat({ token, keyword: scope })
  const { preferences, refetch } = usePreferences(token)

  const handleSend = useCallback(() => {
    if (!input.trim()) return
    chat.sendMessage(input)
    setInput('')
    // Trigger preference refetch after a delay to allow LLM processing
    setTimeout(() => {
      refetch()
      onPreferenceUpdated?.()
    }, 1000)
  }, [input, chat, refetch, onPreferenceUpdated])

  // Count total preferences
  const totalPrefs = preferences
    ? (preferences.global.interests.length +
       preferences.global.dislikes.length +
       Object.values(preferences.keywords).reduce(
         (sum, p) => sum + p.interests.length + p.dislikes.length, 0
       ))
    : 0

  return (
    <div className="rounded-lg bg-card border border-border overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition"
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-primary" />
          <span className="text-sm font-medium text-foreground">偏好助手</span>
          {totalPrefs > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {totalPrefs} 项偏好
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="border-t border-border">
          {/* Scope selector */}
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <span className="text-xs text-muted-foreground">对话范围：</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="text-xs px-2 py-1 rounded bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">全局偏好</option>
              {keywords.map((kw) => (
                <option key={kw} value={kw}>{kw}</option>
              ))}
            </select>
          </div>

          {/* Messages */}
          <div
            ref={chat.scrollRef}
            className="h-64 overflow-y-auto p-3 space-y-2"
          >
            {chat.messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                告诉我你对哪些话题感兴趣，或者不想看到什么内容。
                <br />
                例如：{scope ? `"${scope}主要关注融资和人事变动"` : '"不想看到娱乐八卦"'}
              </div>
            )}
            {chat.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {chat.loading && (
              <div className="flex justify-start">
                <div className="bg-muted px-3 py-2 rounded-lg text-sm text-muted-foreground">
                  思考中...
                </div>
              </div>
            )}
            {chat.error && (
              <div className="text-center text-xs text-destructive">
                {chat.error}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2 p-3 border-t border-border">
            <input
              type="text"
              placeholder="输入你的偏好..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !chat.loading && handleSend()}
              disabled={chat.loading}
              className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={chat.loading || !input.trim()}
              className="px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>

          {/* Current preferences preview */}
          {preferences && totalPrefs > 0 && (
            <PreferencePreview
              pref={scope === '' ? preferences.global : preferences.keywords[scope]}
            />
          )}
        </div>
      )}
    </div>
  )
}

function PreferencePreview({ pref }: { pref?: PreferenceDoc }) {
  if (!pref) return null
  const hasContent = pref.interests.length > 0 || pref.dislikes.length > 0 || pref.notes
  if (!hasContent) return null

  return (
    <div className="p-3 border-t border-border bg-muted/30">
      <div className="text-xs text-muted-foreground mb-1.5">当前偏好：</div>
      <div className="space-y-1">
        {pref.interests.length > 0 && (
          <div className="text-xs">
            <span className="text-primary">感兴趣：</span>
            <span className="text-foreground">{pref.interests.join('、')}</span>
          </div>
        )}
        {pref.dislikes.length > 0 && (
          <div className="text-xs">
            <span className="text-destructive">不感兴趣：</span>
            <span className="text-foreground">{pref.dislikes.join('、')}</span>
          </div>
        )}
        {pref.notes && (
          <div className="text-xs">
            <span className="text-muted-foreground">备注：</span>
            <span className="text-foreground">{pref.notes}</span>
          </div>
        )}
      </div>
    </div>
  )
}
