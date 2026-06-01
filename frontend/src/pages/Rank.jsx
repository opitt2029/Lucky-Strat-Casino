import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import AppShell from '../components/AppShell'
import LeaderboardPanel from '../components/LeaderboardPanel'
import MetricCard from '../components/MetricCard'
import { fetchRanks, setRankSearchQuery, setRankTab } from '../store/slices/rankSlice'

export default function Rank() {
  const dispatch = useDispatch()
  const { globalRank, friendRank, myGlobalRank, activeTab, searchQuery, loading, error } = useSelector((state) => state.rank)
  const player = useSelector((state) => state.auth.player)
  const rows = activeTab === 'friends' ? friendRank : globalRank
  const filteredRows = useMemo(
    () => rows.filter((row) => (row.nickname || row.name).toLowerCase().includes(searchQuery.toLowerCase())),
    [rows, searchQuery]
  )
  const topScore = globalRank[0]?.score || 0

  useEffect(() => {
    dispatch(fetchRanks())
  }, [dispatch])

  return (
    <AppShell>
      <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-4">
          <section className="rounded border border-white/10 bg-zinc-900 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex rounded border border-white/10 bg-black p-1">
                {[
                  ['global', '全服 TOP100'],
                  ['friends', '好友榜'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => dispatch(setRankTab(key))}
                    className={[
                      'rounded px-4 py-2 text-sm font-black transition',
                      activeTab === key ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:text-white',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                className="min-h-11 rounded border border-white/10 bg-black px-4 text-sm font-bold text-white outline-none focus:border-white"
                placeholder="搜尋好友名次"
                value={searchQuery}
                onChange={(event) => dispatch(setRankSearchQuery(event.target.value))}
              />
            </div>
            {error && <p className="mt-3 rounded border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</p>}
          </section>
          <LeaderboardPanel rows={filteredRows} myNickname={player?.nickname} limit={100} />
        </div>
        <aside className="grid gap-4 content-start">
          <MetricCard label="榜首分數" value={topScore.toLocaleString()} caption="rankSlice.globalRank" tone="light" />
          <MetricCard label="我的名次" value={myGlobalRank?.rank ? `#${myGlobalRank.rank}` : '-'} caption={player?.nickname || '目前玩家'} />
          <MetricCard label="刷新來源" value={loading ? 'Loading' : 'WebSocket'} caption="/topic/rank" />
          <MetricCard label="榜單筆數" value={filteredRows.length.toLocaleString()} caption={activeTab === 'friends' ? '好友榜' : '全服 TOP100'} />
        </aside>
      </section>
    </AppShell>
  )
}
