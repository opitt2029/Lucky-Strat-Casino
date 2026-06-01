const fallbackRows = [
  { name: 'Nova', score: 98200, trend: '+12%' },
  { name: 'AceLin', score: 87400, trend: '+9%' },
  { name: 'BlackJack', score: 72150, trend: '+5%' },
  { name: 'Mika', score: 69000, trend: '+3%' },
]

export default function LeaderboardPanel({ rows = fallbackRows, myNickname = '', limit = 10 }) {
  const displayRows = rows.length ? rows : fallbackRows

  return (
    <section className="rounded border border-white/10 bg-zinc-900 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Realtime Rank</p>
          <h2 className="mt-1 text-xl font-black text-white">即時排行榜</h2>
        </div>
        <span className="rounded border border-white/10 px-3 py-1 text-xs font-black text-zinc-400">WS Ready</span>
      </div>

      <div className="mt-4 space-y-2">
        {displayRows.slice(0, limit).map((row, index) => {
          const nickname = row.nickname || row.name
          const isMe = myNickname && nickname === myNickname
          return (
          <div
            key={row.id || nickname}
            className={[
              'grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded border p-3',
              isMe ? 'border-white bg-white text-zinc-950' : 'border-white/10 bg-black',
            ].join(' ')}
          >
            <span className="grid h-8 w-8 place-items-center rounded bg-white text-sm font-black text-zinc-950">{index + 1}</span>
            <div>
              <p className={['font-black', isMe ? 'text-zinc-950' : 'text-white'].join(' ')}>{nickname}</p>
              <p className={['text-xs', isMe ? 'text-zinc-600' : 'text-zinc-500'].join(' ')}>今日累積贏分</p>
            </div>
            <div className="text-right">
              <p className={['font-black', isMe ? 'text-zinc-950' : 'text-white'].join(' ')}>{row.score.toLocaleString()}</p>
              <p className={['text-xs font-bold', isMe ? 'text-zinc-600' : 'text-zinc-400'].join(' ')}>{row.trend}</p>
            </div>
          </div>
        )})}
      </div>
    </section>
  )
}
