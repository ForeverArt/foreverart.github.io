import { useState, useRef, useCallback, useEffect } from 'react'

interface UseCountdownReturn {
  secondsLeft: number
  isRunning: boolean
  isExpired: boolean
  /** 0.0 (just started) → 1.0 (expired) */
  progress: number
  start: () => void
  reset: () => void
}

export function useCountdown(totalSeconds: number): UseCountdownReturn {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = undefined
    }
  }, [])

  const start = useCallback(() => {
    clearTimer()
    setIsExpired(false)
    setIsRunning(true)
    setSecondsLeft((prev) => {
      // If already at 0, restart from total
      return prev <= 0 ? totalSeconds : prev
    })
  }, [totalSeconds, clearTimer])

  const reset = useCallback(() => {
    clearTimer()
    setIsRunning(false)
    setIsExpired(false)
    setSecondsLeft(totalSeconds)
  }, [totalSeconds, clearTimer])

  useEffect(() => {
    if (!isRunning) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer()
          setIsRunning(false)
          setIsExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return clearTimer
  }, [isRunning, clearTimer])

  const progress = 1 - secondsLeft / totalSeconds

  return { secondsLeft, isRunning, isExpired, progress, start, reset }
}
