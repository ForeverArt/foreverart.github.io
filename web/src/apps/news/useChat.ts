import { useState, useCallback, useRef, useEffect } from 'react'
import { api, type ChatMessageItem, type ChatResponse, type PreferenceDoc } from './api'

export interface UseChatOptions {
  token: string | null
  keyword: string // '' = global
}

export function useChat({ token, keyword }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [updatedPreference, setUpdatedPreference] = useState<PreferenceDoc | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load conversation history when keyword changes
  const loadHistory = useCallback(async () => {
    if (!token) return
    try {
      const convs = await api.conversations(token, keyword)
      if (convs.length > 0) {
        const conv = convs[0]
        setConversationId(conv.id)
        const msgs = await api.conversationMessages(token, conv.id)
        setMessages(msgs)
      } else {
        setConversationId(null)
        setMessages([])
      }
    } catch {
      setConversationId(null)
      setMessages([])
    }
  }, [token, keyword])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    if (!token || !text.trim()) return
    setLoading(true)
    setError(null)

    // Optimistic: add user message
    const tempUserMsg: ChatMessageItem = {
      id: Date.now(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      const resp: ChatResponse = await api.chat(
        token,
        keyword,
        text,
        conversationId ?? undefined,
      )
      setConversationId(resp.conversationId)
      // Add assistant message
      const assistantMsg: ChatMessageItem = {
        id: Date.now() + 1,
        role: 'assistant',
        content: resp.assistantMessage,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      if (resp.updatedPreferences) {
        setUpdatedPreference(resp.updatedPreferences)
      }
    } catch (err: any) {
      setError(err.message)
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id))
    } finally {
      setLoading(false)
    }
  }, [token, keyword, conversationId])

  return {
    messages,
    loading,
    error,
    conversationId,
    updatedPreference,
    sendMessage,
    scrollRef,
    reload: loadHistory,
  }
}
