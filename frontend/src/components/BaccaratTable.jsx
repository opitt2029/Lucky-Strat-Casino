import { useMemo } from 'react'

const betAreas = [
  { key: 'player', label: '閒家', odds: '1:1' },
  { key: 'banker', label: '莊家', odds: '0.95:1' },
  { key: 'tie', label: '和局', odds: '8:1' },
]

export default function BaccaratTable({ onBet, bets = {}, round, loading = false }) {
  const totalBet = useMemo(() => Object.values(bets).reduce((sum, value) => sum + value, 0), [bets])

  const placeBet = (area) => {
    onBet?.(area.key)
  }

  const playerCards = round?.playerCards || ['?', '?']
  const bankerCards = round?.bankerCards || ['?', '?']

  return (
    <section className="rounded border border-white/10 bg-zinc-900 p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Baccarat</p>
          <h2 className="mt-1 text-xl font-black text-white">百家樂多下注區</h2>
        </div>
        <div className="rounded bg-white px-4 py-2 text-sm font-black text-zinc-950">本局下注 {totalBet.toLocaleString()}</div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {betAreas.map((area) => (
          <button
            key={area.key}
            type="button"
            onClick={() => placeBet(area)}
            disabled={loading}
            className={[
              'min-h-32 rounded border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60',
              round?.winner === area.key
                ? 'animate-win-pulse border-white bg-white text-zinc-950'
                : 'border-white/10 bg-black hover:border-white hover:bg-white hover:text-zinc-950',
            ].join(' ')}
          >
            <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">Odds {area.odds}</span>
            <span className="mt-4 block text-2xl font-black">{area.label}</span>
            <span className="mt-6 block rounded border border-current px-3 py-2 text-center text-sm font-black">
              {(bets[area.key] || 0).toLocaleString()}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded border border-white/10 bg-black p-4">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">Player</p>
          <div className="mt-3 flex gap-2">
            {playerCards.map((card, index) => (
              <div
                key={`${card}-${index}`}
                className={['grid h-24 w-16 place-items-center rounded bg-white text-2xl font-black text-zinc-950', loading ? 'animate-card-flip' : ''].join(' ')}
              >
                {card}
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm font-black text-zinc-300">點數 {round?.playerPoints ?? '-'}</p>
        </div>
        <div className="rounded border border-white/10 bg-black p-4">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">Banker</p>
          <div className="mt-3 flex gap-2">
            {bankerCards.map((card, index) => (
              <div
                key={`${card}-${index}`}
                className={['grid h-24 w-16 place-items-center rounded bg-white text-2xl font-black text-zinc-950', loading ? 'animate-card-flip' : ''].join(' ')}
              >
                {card}
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm font-black text-zinc-300">點數 {round?.bankerPoints ?? '-'}</p>
        </div>
      </div>
      {round && (
        <div className="mt-5 rounded border border-white/10 bg-black p-4">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">Result</p>
          <p className="mt-2 text-2xl font-black text-white">
            {round.winner === 'player' ? '閒家勝' : round.winner === 'banker' ? '莊家勝' : '和局'} / 派彩 {round.payout.toLocaleString()}
          </p>
        </div>
      )}
    </section>
  )
}
