import { useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { useWebSocket } from '../hooks/useWebSocket'
import { pushNotification, setResult } from '../store/slices/gameSlice'
import { upsertRankRows } from '../store/slices/rankSlice'
import { setBalance } from '../store/slices/walletSlice'

export default function RealtimeBridge() {
  const dispatch = useDispatch()
  const subscriptions = useMemo(
    () => ({
      '/user/queue/notifications': (payload) => {
        dispatch(pushNotification(payload))
        if (payload.game) dispatch(setResult(payload))
      },
      '/topic/rank': (payload) => dispatch(upsertRankRows(payload)),
      '/topic/wallet': (payload) => dispatch(setBalance(payload)),
      '/topic/game/result': (payload) => dispatch(setResult(payload)),
    }),
    [dispatch]
  )

  useWebSocket(subscriptions)

  return null
}
