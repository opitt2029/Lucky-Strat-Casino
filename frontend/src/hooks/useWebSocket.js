import { useEffect, useRef, useCallback, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useDispatch, useSelector } from 'react-redux'
import { pushNotification, setConnectionStatus } from '../store/slices/gameSlice'

/**
 * WebSocket hook using STOMP over SockJS.
 * Connects when the player is authenticated; disconnects on cleanup.
 *
 * @param {Object} subscriptions - Map of { destination: handlerFn }
 * @returns {{ publish: (destination, body) => void, status: string, reconnectAttempt: number }}
 */
export function useWebSocket(subscriptions = {}) {
  const dispatch = useDispatch()
  const clientRef = useRef(null)
  const attemptRef = useRef(0)
  const mockTimerRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [reconnectAttempt, setReconnectAttempt] = useState(0)
  const token = useSelector((state) => state.auth.accessToken)
  const mockWs = import.meta.env.VITE_USE_MOCK_API !== 'false'
  const wsUrl = import.meta.env.VITE_WS_URL || '/ws'

  const updateStatus = useCallback(
    (nextStatus, nextAttempt = attemptRef.current) => {
      setStatus(nextStatus)
      setReconnectAttempt(nextAttempt)
      dispatch(setConnectionStatus({ status: nextStatus, reconnectAttempt: nextAttempt }))
    },
    [dispatch]
  )

  const publish = useCallback((destination, body) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination,
        body: JSON.stringify(body),
      })
      return
    }

    if (subscriptions[destination]) {
      subscriptions[destination](body)
    }
  }, [subscriptions])

  useEffect(() => {
    if (!token) return

    if (mockWs) {
      updateStatus('connected', 0)
      mockTimerRef.current = window.setInterval(() => {
        const notification = {
          id: `notice-${Date.now()}`,
          title: '遊戲結果通知',
          message: '前端模擬 WebSocket：你的最新局數已完成結算',
          createdAt: new Date().toISOString(),
        }
        dispatch(pushNotification(notification))
        subscriptions['/user/queue/notifications']?.(notification)
        subscriptions['/topic/rank']?.({
          items: [
            {
              id: 'mock-live-rank',
              nickname: 'LiveWinner',
              name: 'LiveWinner',
              score: 130000 + Math.floor(Math.random() * 5000),
              trend: '+18%',
            },
          ],
        })
      }, 16000)

      return () => {
        window.clearInterval(mockTimerRef.current)
        updateStatus('disconnected', 0)
      }
    }

    updateStatus('connecting', attemptRef.current)
    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl.replace(/^ws/, 'http')),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: Math.min(30000, 1000 * 2 ** attemptRef.current),
      onConnect: () => {
        attemptRef.current = 0
        updateStatus('connected', 0)
        Object.entries(subscriptions).forEach(([destination, handler]) => {
          client.subscribe(destination, (message) => {
            try {
              handler(JSON.parse(message.body))
            } catch {
              handler(message.body)
            }
          })
        })
      },
      onStompError: () => {
        attemptRef.current += 1
        updateStatus('reconnecting', attemptRef.current)
      },
      onWebSocketClose: () => {
        attemptRef.current += 1
        updateStatus('reconnecting', attemptRef.current)
      },
      onDisconnect: () => {
        updateStatus('disconnected', attemptRef.current)
      },
    })

    client.activate()
    clientRef.current = client

    return () => {
      client.deactivate()
      updateStatus('disconnected', attemptRef.current)
    }
    // subscriptions intentionally excluded — callers should memoize handlers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, wsUrl, mockWs, updateStatus])

  return { publish, status, reconnectAttempt }
}
