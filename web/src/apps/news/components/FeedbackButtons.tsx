import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react'
import { api } from '../api'

interface FeedbackButtonsProps {
  token: string
  newsItemId: string
  newsItemTitle: string
  keyword: string
}

export function FeedbackButtons({ token, newsItemId, newsItemTitle, keyword }: FeedbackButtonsProps) {
  const [state, setState] = useState<'idle' | 'more' | 'less'>('idle')

  const submit = async (type: 'more_like_this' | 'not_interested') => {
    if (state !== 'idle') return
    setState(type === 'more_like_this' ? 'more' : 'less')
    try {
      await api.feedback(token, {
        newsItemId,
        newsItemTitle,
        keyword,
        feedbackType: type,
      })
    } catch {
      setState('idle')
    }
  }

  if (state === 'more') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-primary">
        <Check size={12} />
        已记录偏好
      </span>
    )
  }
  if (state === 'less') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Check size={12} />
        已减少推荐
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        onClick={() => submit('more_like_this')}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition"
        title="更多此类"
      >
        <ThumbsUp size={12} />
      </button>
      <button
        onClick={() => submit('not_interested')}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition"
        title="不感兴趣"
      >
        <ThumbsDown size={12} />
      </button>
    </span>
  )
}
