import { NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { lazy, Suspense, useEffect, useState } from 'react'
import ErrorBoundary from './ErrorBoundary'
import { logoutMember } from '../store/slices/authSlice'
import { clearNotifications } from '../store/slices/gameSlice'
import { fetchRanks } from '../store/slices/rankSlice'
import { fetchWallet } from '../store/slices/walletSlice'
import { getBackgroundStyle } from '../theme/backgroundTheme'

const navItems = [
  { to: '/', label: '首頁' },
  { to: '/games', label: '遊戲大全' },
  { to: '/shop', label: '賭場商城' },
  { to: '/rank', label: '排行榜' },
  { to: '/transactions', label: '交易紀錄' },
  { to: '/profile', label: '會員中心' },
]

const RealtimeBridge = lazy(() => import('./RealtimeBridge'))

export default function AppShell({ children }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [noticeOpen, setNoticeOpen] = useState(false)
  const player = useSelector((state) => state.auth.player)
  const balance = useSelector((state) => state.wallet.balance)
  const status = useSelector((state) => state.game.status)
  const connectionStatus = useSelector((state) => state.game.connectionStatus)
  const reconnectAttempt = useSelector((state) => state.game.reconnectAttempt)
  const notifications = useSelector((state) => state.game.notifications)

  useEffect(() => {
    dispatch(fetchWallet())
    dispatch(fetchRanks())
  }, [dispatch])

  const handleLogout = () => {
    dispatch(logoutMember()).finally(() => navigate('/member'))
  }

  return (
    <div className="theme-background min-h-screen text-zinc-50" style={getBackgroundStyle('app')}>
      <ErrorBoundary>
        <Suspense fallback={null}>
          <RealtimeBridge />
        </Suspense>
      </ErrorBoundary>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Lucky Star Casino</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">幸運星幣城</h1>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm sm:flex sm:items-center">
              <div className="rounded border border-white/10 bg-white px-4 py-2 text-zinc-950">
                <span className="block text-[11px] font-bold uppercase text-zinc-500">玩家</span>
                <span className="font-black">{player?.nickname || player?.username || 'Demo Player'}</span>
              </div>
              <div className="rounded border border-white/10 bg-zinc-900 px-4 py-2">
                <span className="block text-[11px] font-bold uppercase text-zinc-500">籌碼</span>
                <span className="font-black">{balance.toLocaleString()}</span>
              </div>
              <div className="rounded border border-white/10 bg-zinc-900 px-4 py-2">
                <span className="block text-[11px] font-bold uppercase text-zinc-500">狀態</span>
                <span className="font-black">{status}</span>
              </div>
              <div className="rounded border border-white/10 bg-zinc-900 px-4 py-2">
                <span className="block text-[11px] font-bold uppercase text-zinc-500">WS</span>
                <span className="font-black">
                  {connectionStatus}
                  {reconnectAttempt ? ` #${reconnectAttempt}` : ''}
                </span>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNoticeOpen((open) => !open)}
                  className="relative grid h-full min-h-12 w-full place-items-center rounded border border-white/20 px-4 py-2 text-white transition hover:bg-white hover:text-zinc-950 sm:w-12"
                  aria-label="通知中心"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                  </svg>
                  {notifications.length > 0 && (
                    <span className="absolute right-2 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-black text-zinc-950">
                      {notifications.length}
                    </span>
                  )}
                </button>
                {noticeOpen && (
                  <div className="absolute right-0 top-14 z-40 w-80 rounded border border-white/10 bg-zinc-950 p-3 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-white">通知中心</p>
                      <button
                        type="button"
                        onClick={() => dispatch(clearNotifications())}
                        className="rounded border border-white/10 px-2 py-1 text-xs font-bold text-zinc-300 hover:bg-white hover:text-zinc-950"
                      >
                        清空
                      </button>
                    </div>
                    <div className="mt-3 grid max-h-80 gap-2 overflow-auto">
                      {notifications.length === 0 ? (
                        <p className="rounded bg-black p-3 text-sm text-zinc-500">目前沒有新通知</p>
                      ) : (
                        notifications.map((item) => (
                          <div key={item.id || item.createdAt} className="rounded border border-white/10 bg-black p-3">
                            <p className="text-sm font-black text-white">{item.title || '系統通知'}</p>
                            <p className="mt-1 text-xs leading-5 text-zinc-400">{item.message || '已收到新的即時事件'}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded border border-white/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white hover:text-zinc-950"
              >
                登出
              </button>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    'shrink-0 rounded px-4 py-2 text-sm font-bold transition',
                    isActive
                      ? 'bg-white text-zinc-950'
                      : 'border border-white/10 bg-zinc-900 text-zinc-300 hover:border-white/30 hover:text-white',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
