import { useEffect, useMemo, useRef, useState } from 'react'

const symbols = ['7', 'BAR', 'STAR', 'CHIP', 'A', 'K']
const reelCycles = Array.from({ length: 24 }, (_, index) => symbols[index % symbols.length])
const reelSettleLead = 9
const reelStopStagger = 360
const reelSettleDuration = 1160

const symbolMeta = {
  '7': { label: '7', caption: 'Lucky', tone: 'slot-symbol-seven' },
  BAR: { label: 'BAR', caption: 'Triple', tone: 'slot-symbol-bar' },
  STAR: { label: 'STAR', caption: 'Bonus', tone: 'slot-symbol-star' },
  CHIP: { label: 'CHIP', caption: 'Credit', tone: 'slot-symbol-chip' },
  A: { label: 'A', caption: 'Ace', tone: 'slot-symbol-card' },
  K: { label: 'K', caption: 'King', tone: 'slot-symbol-card' },
}

function SymbolTile({ symbol, compact = false, isWinning = false, ghost = false }) {
  const meta = symbolMeta[symbol] || { label: symbol, caption: 'Prize', tone: 'slot-symbol-card' }

  return (
    <div
      className={[
        'slot-symbol-tile',
        meta.tone,
        compact ? 'slot-symbol-tile--compact' : '',
        isWinning ? 'slot-symbol-tile--winning' : '',
        ghost ? 'slot-symbol-tile--ghost' : '',
      ].join(' ')}
    >
      <span className="slot-symbol-label">{meta.label}</span>
      {!compact && <span className="slot-symbol-caption">{meta.caption}</span>}
    </div>
  )
}

export default function SlotMachinePreview({ compact = false, grid, winningCells = [], spinning: externalSpinning = false, onSpin }) {
  const [localSpinning, setLocalSpinning] = useState(false)
  const [reelModes, setReelModes] = useState(['idle', 'idle', 'idle'])
  const previousSpinning = useRef(false)
  const fallbackGrid = useMemo(
    () =>
      Array.from({ length: 3 }, (_, rowIndex) =>
        Array.from({ length: 3 }, (_, colIndex) => symbols[(rowIndex + colIndex) % symbols.length])
      ),
    []
  )
  const displayGrid = grid || fallbackGrid
  const spinning = externalSpinning || localSpinning
  const displayColumns = [0, 1, 2].map((colIndex) => displayGrid.map((row) => row[colIndex]))
  const winningCellSet = new Set(winningCells.map(([row, col]) => `${row}-${col}`))
  const visualBusy = spinning || reelModes.some((mode) => mode === 'spinning' || mode === 'settling')
  const hasWin = winningCells.length > 0

  const spin = () => {
    if (visualBusy) return
    if (onSpin) {
      onSpin()
      return
    }
    setLocalSpinning(true)
    window.setTimeout(() => setLocalSpinning(false), 1200)
  }

  useEffect(() => {
    const timeoutIds = []

    if (!previousSpinning.current && spinning) {
      setReelModes(['spinning', 'spinning', 'spinning'])
    }

    if (previousSpinning.current && !spinning) {
      setReelModes(['settling', 'spinning', 'spinning'])

      ;[0, 1, 2].forEach((colIndex) => {
        const settleStart = colIndex * reelStopStagger
        const resolveAt = settleStart + reelSettleDuration

        if (colIndex > 0) {
          timeoutIds.push(
            window.setTimeout(() => {
              setReelModes((current) => current.map((mode, index) => (index === colIndex ? 'settling' : mode)))
            }, settleStart)
          )
        }

        timeoutIds.push(
          window.setTimeout(() => {
            setReelModes((current) => current.map((mode, index) => (index === colIndex ? 'resolved' : mode)))
          }, resolveAt)
        )
      })

      const idleAt = (displayColumns.length - 1) * reelStopStagger + reelSettleDuration + 180
      timeoutIds.push(window.setTimeout(() => setReelModes(['idle', 'idle', 'idle']), idleAt))
    }

    previousSpinning.current = spinning
    return () => timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
  }, [displayColumns.length, spinning])

  return (
    <section className={['slot-machine luxury-panel rounded p-4 sm:p-5', compact ? 'slot-machine--compact' : ''].join(' ')}>
      <div className="slot-machine__marquee" aria-hidden="true">
        {Array.from({ length: 22 }, (_, index) => (
          <span key={index} className="slot-machine__bulb" style={{ animationDelay: `${index * 70}ms` }} />
        ))}
      </div>

      <div className="slot-machine__topper">
        <div>
          <p className="slot-machine__eyebrow">Lucky Star Deluxe</p>
          <h2 className="slot-machine__title">星幣老虎機</h2>
        </div>
        <div className="slot-machine__jackpot" aria-label="Jackpot">
          <span>GRAND</span>
          <strong>777,000</strong>
        </div>
      </div>

      <div
        className={[
          'slot-cabinet mt-5',
          compact ? 'slot-cabinet--compact' : '',
          reelModes.some((mode) => mode === 'spinning') ? 'slot-cabinet--spinning' : '',
          reelModes.some((mode) => mode === 'settling') ? 'slot-cabinet--settling' : '',
          hasWin && !visualBusy ? 'slot-cabinet--win' : '',
        ].join(' ')}
      >
        <div className="slot-payline" aria-hidden="true" />
        <div className="slot-reels" aria-live="polite">
          {displayColumns.map((column, colIndex) => {
            const reelMode = reelModes[colIndex]
            const settleSymbols = [
              ...Array.from({ length: reelSettleLead }, (_, index) => symbols[(index + colIndex * 2) % symbols.length]),
              ...column,
            ]

            return (
              <div
                key={`reel-${colIndex}`}
                className="slot-reel-window"
                style={{
                  '--reel-delay': `${colIndex * 90}ms`,
                  '--reel-duration': `${640 + colIndex * 80}ms`,
                  '--settle-offset': `calc(-1 * ${reelSettleLead} * ((var(--slot-reel-height) - var(--slot-row-padding) - var(--slot-row-padding)) / 3 + var(--slot-row-gap)))`,
                }}
              >
                {reelMode === 'spinning' ? (
                  <div className="slot-reel-strip">
                    {[...reelCycles, ...reelCycles].map((symbol, index) => (
                      <SymbolTile key={`${colIndex}-cycle-${index}`} symbol={symbol} compact={compact} ghost />
                    ))}
                  </div>
                ) : reelMode === 'settling' ? (
                  <div className="slot-reel-settle-strip">
                    {settleSymbols.map((symbol, index) => (
                      <SymbolTile
                        key={`${colIndex}-settle-${index}-${symbol}`}
                        symbol={symbol}
                        compact={compact}
                        ghost={index < reelSettleLead}
                        isWinning={
                          index >= reelSettleLead && winningCellSet.has(`${index - reelSettleLead}-${colIndex}`)
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="slot-reel-result">
                    {column.map((symbol, rowIndex) => (
                      <SymbolTile
                        key={`${rowIndex}-${colIndex}-${symbol}`}
                        symbol={symbol}
                        compact={compact}
                        isWinning={winningCellSet.has(`${rowIndex}-${colIndex}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="slot-machine__glass" aria-hidden="true" />
      </div>

      <div className="slot-console">
        <div className="slot-console__meters" aria-label="Slot machine control display">
          <div>
            <span>LINES</span>
            <strong>03</strong>
          </div>
          <div>
            <span>BET</span>
            <strong>MAX 5K</strong>
          </div>
          <div>
            <span>WIN</span>
            <strong>{hasWin && !visualBusy ? 'PAID' : 'READY'}</strong>
          </div>
        </div>
        <button
          type="button"
          onClick={spin}
          disabled={visualBusy}
          className="slot-spin-button gold-button rounded text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {visualBusy ? 'SPINNING' : 'SPIN'}
        </button>
        <div className={['slot-lever', visualBusy ? 'slot-lever--active' : ''].join(' ')} aria-hidden="true">
          <span />
        </div>
      </div>

      <div
        className={[
          'slot-status mt-4 rounded border p-3',
          visualBusy
            ? 'slot-status--active border-yellow-200 bg-yellow-200 text-red-950'
            : hasWin
              ? 'border-yellow-200/70 bg-yellow-200/10 text-yellow-100'
              : 'border-yellow-200/15 bg-red-950/70 text-yellow-100/62',
        ].join(' ')}
      >
        <p className="text-sm font-bold">
          {visualBusy ? '轉輪由左至右煞停中...' : hasWin ? '中線命中，派彩已回填。' : 'Ready: 選擇下注金額後開始本局。'}
        </p>
      </div>
    </section>
  )
}
