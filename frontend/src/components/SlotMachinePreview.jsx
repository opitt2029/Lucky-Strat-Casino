import { useMemo, useState } from 'react'

const symbols = ['7', 'BAR', 'STAR', 'CHIP', 'A', 'K']

export default function SlotMachinePreview({ compact = false, grid, winningCells = [], spinning: externalSpinning = false, onSpin }) {
  const [localSpinning, setLocalSpinning] = useState(false)
  const fallbackGrid = useMemo(
    () =>
      Array.from({ length: 3 }, (_, rowIndex) =>
        Array.from({ length: 3 }, (_, colIndex) => symbols[(rowIndex + colIndex) % symbols.length])
      ),
    []
  )
  const displayGrid = grid || fallbackGrid
  const spinning = externalSpinning || localSpinning
  const winningCellSet = new Set(winningCells.map(([row, col]) => `${row}-${col}`))

  const spin = () => {
    if (onSpin) {
      onSpin()
      return
    }
    setLocalSpinning(true)
    window.setTimeout(() => setLocalSpinning(false), 1200)
  }

  return (
    <section className="rounded border border-white/10 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">3x3 Slot</p>
          <h2 className="mt-1 text-xl font-black text-white">星幣老虎機</h2>
        </div>
        <button
          type="button"
          onClick={spin}
          disabled={spinning}
          className="rounded bg-white px-4 py-2 text-sm font-black text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {spinning ? 'SPIN' : 'Spin'}
        </button>
      </div>

      <div className={['mt-4 grid grid-cols-3 gap-2', compact ? 'min-h-36' : 'min-h-[19rem] sm:min-h-[24rem]'].join(' ')}>
        {displayGrid.map((row, rowIndex) =>
          row.map((symbol, colIndex) => {
            const isWinning = winningCellSet.has(`${rowIndex}-${colIndex}`)
            return (
              <div
                key={`${rowIndex}-${colIndex}-${symbol}`}
                className={[
                  'grid place-items-center overflow-hidden rounded border bg-black text-center font-black text-white shadow-inner transition',
                  isWinning ? 'animate-win-pulse border-white bg-white text-zinc-950' : 'border-white/10',
                  compact ? 'min-h-20 text-sm' : 'min-h-24 text-2xl sm:min-h-32 sm:text-4xl',
                  spinning ? 'animate-reel-blur' : '',
                ].join(' ')}
                style={{ animationDelay: `${colIndex * 80}ms` }}
              >
                {symbol}
              </div>
            )
          })
        )}
      </div>

      <div className={['mt-4 rounded border p-3', spinning ? 'animate-win-pulse border-white bg-white text-zinc-950' : 'border-white/10 bg-black text-zinc-400'].join(' ')}>
        <p className="text-sm font-bold">{spinning ? '轉輪運算中...' : 'Ready: 可由 SPIN API 或模擬服務回填結果。'}</p>
      </div>
    </section>
  )
}
