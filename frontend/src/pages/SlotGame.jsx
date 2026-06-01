import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import AppShell from '../components/AppShell'
import MetricCard from '../components/MetricCard'
import SlotMachinePreview from '../components/SlotMachinePreview'
import { spinSlot } from '../store/slices/gameSlice'
import { setBalance } from '../store/slices/walletSlice'

const betOptions = [100, 500, 1000, 'MAX']

export default function SlotGame() {
  const dispatch = useDispatch()
  const [selectedBet, setSelectedBet] = useState(100)
  const balance = useSelector((state) => state.wallet.balance)
  const { status, result, loading, error, slotGrid, winningCells } = useSelector((state) => state.game)
  const resolvedBet = selectedBet === 'MAX' ? Math.max(Math.min(balance, 5000), 100) : selectedBet

  const handleSpinRound = async () => {
    try {
      const spinResult = await dispatch(spinSlot({ bet: resolvedBet })).unwrap()
      dispatch(setBalance(spinResult.wallet))
    } catch {
      // gameSlice already exposes the message in state.error
    }
  }

  return (
    <AppShell>
      <section className="grid gap-4 lg:grid-cols-[0.68fr_0.32fr]">
        <SlotMachinePreview grid={slotGrid} winningCells={winningCells} spinning={loading} onSpin={handleSpinRound} />

        <aside className="grid gap-4 content-start">
          <MetricCard label="遊戲狀態" value={status} caption="gameSlice.status" tone="light" />
          <MetricCard label="下注金額" value={resolvedBet.toLocaleString()} caption="100 / 500 / 1000 / MAX" />
          <MetricCard
            label="最近結果"
            value={result ? `${result.payout.toLocaleString()}` : '-'}
            caption={result?.game === 'slot' ? `${result.multiplier}x / ${result.roundId}` : '等待本局結果'}
          />
          <div className="rounded border border-white/10 bg-zinc-900 p-4">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">Bet</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {betOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelectedBet(option)}
                  className={[
                    'min-h-12 rounded border px-3 text-sm font-black transition',
                    selectedBet === option
                      ? 'border-white bg-white text-zinc-950'
                      : 'border-white/10 bg-black text-zinc-300 hover:border-white hover:text-white',
                  ].join(' ')}
                >
                  {option === 'MAX' ? 'MAX' : option.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="rounded border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</p>}
          <button
            type="button"
            onClick={handleSpinRound}
            disabled={loading || balance < resolvedBet}
            className="rounded bg-white px-5 py-4 text-sm font-black text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'SPINNING...' : 'SPIN'}
          </button>
        </aside>
      </section>
    </AppShell>
  )
}
