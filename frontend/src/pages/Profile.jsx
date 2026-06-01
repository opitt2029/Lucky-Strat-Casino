import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import AppShell from '../components/AppShell'
import MetricCard from '../components/MetricCard'
import { fetchProfile, updateProfile } from '../store/slices/authSlice'
import { mockApi } from '../services/mockApi'
import { setBalance } from '../store/slices/walletSlice'

export default function Profile() {
  const dispatch = useDispatch()
  const player = useSelector((state) => state.auth.player)
  const authLoading = useSelector((state) => state.auth.loading)
  const authError = useSelector((state) => state.auth.error)
  const wallet = useSelector((state) => state.wallet)
  const [form, setForm] = useState({ nickname: '', avatarUrl: '' })
  const [friends, setFriends] = useState([])
  const [friendName, setFriendName] = useState('')
  const [giftAmount, setGiftAmount] = useState(500)
  const [notice, setNotice] = useState('')
  const progress = Math.min(((player?.consecutiveCheckInDays || 0) / 7) * 100, 100)

  useEffect(() => {
    dispatch(fetchProfile())
    mockApi.getFriends().then(setFriends)
  }, [dispatch])

  useEffect(() => {
    setForm({
      nickname: player?.nickname || '',
      avatarUrl: player?.avatarUrl || '',
    })
  }, [player])

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const handleSave = async (event) => {
    event.preventDefault()
    try {
      await dispatch(updateProfile(form)).unwrap()
      setNotice('個人資料已更新')
    } catch {
      setNotice('')
    }
  }

  const handleAddFriend = async (event) => {
    event.preventDefault()
    try {
      const nextFriends = await mockApi.addFriend(friendName)
      setFriends(nextFriends)
      setFriendName('')
      setNotice('好友已加入')
    } catch (error) {
      setNotice(error.message)
    }
  }

  const handleRemoveFriend = async (friendId) => {
    try {
      const nextFriends = await mockApi.removeFriend(friendId)
      setFriends(nextFriends)
      setNotice('好友已刪除')
    } catch (error) {
      setNotice(error.message)
    }
  }

  const handleGift = async (friendId) => {
    try {
      const result = await mockApi.giftCoins({ friendId, amount: Number(giftAmount) })
      dispatch(setBalance(result.wallet))
      setFriends(result.friends)
      setNotice(`已贈送 ${Number(giftAmount).toLocaleString()} 星幣`)
    } catch (error) {
      setNotice(error.message)
    }
  }

  return (
    <AppShell>
      <section className="grid gap-4 lg:grid-cols-[0.75fr_0.25fr]">
        <form onSubmit={handleSave} className="rounded border border-white/10 bg-zinc-900 p-6">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Profile</p>
          <h2 className="mt-3 text-3xl font-black">會員中心</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-zinc-300">
              玩家 ID
              <input className="rounded border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white" value={player?.id || 'demo-player'} readOnly />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-300">
              暱稱
              <input
                name="nickname"
                className="rounded border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white"
                value={form.nickname}
                onChange={handleChange}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-300 sm:col-span-2">
              Avatar URL
              <input
                name="avatarUrl"
                className="rounded border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white"
                placeholder="https://example.com/avatar.png"
                value={form.avatarUrl}
                onChange={handleChange}
              />
            </label>
          </div>
          {authError && <p className="mt-4 rounded border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{authError}</p>}
          {notice && <p className="mt-4 rounded border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">{notice}</p>}
          <button
            type="submit"
            disabled={authLoading}
            className="mt-6 rounded bg-white px-5 py-3 text-sm font-black text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {authLoading ? '儲存中...' : '儲存設定'}
          </button>
        </form>

        <aside className="grid gap-4 content-start">
          <MetricCard label="可用籌碼" value={wallet.balance.toLocaleString()} caption="walletSlice.balance" tone="light" />
          <MetricCard label="凍結籌碼" value={wallet.frozenAmount.toLocaleString()} caption="下注中保留" />
          <div className="rounded border border-white/10 bg-zinc-900 p-4">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">Check-in</p>
            <p className="mt-2 text-2xl font-black text-white">{player?.consecutiveCheckInDays || 0} 天</p>
            <div className="mt-4 h-3 overflow-hidden rounded bg-black">
              <div className="h-full bg-white transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs font-bold text-zinc-500">7 天進度獎勵</p>
          </div>
        </aside>
      </section>

      <section className="mt-6 rounded border border-white/10 bg-zinc-900 p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Friends</p>
            <h2 className="mt-1 text-2xl font-black text-white">好友列表</h2>
          </div>
          <form onSubmit={handleAddFriend} className="flex gap-2">
            <input
              className="min-h-11 rounded border border-white/10 bg-black px-4 text-sm font-bold text-white outline-none focus:border-white"
              placeholder="輸入好友帳號"
              value={friendName}
              onChange={(event) => setFriendName(event.target.value)}
              required
            />
            <button type="submit" className="rounded bg-white px-4 py-2 text-sm font-black text-zinc-950 transition hover:bg-zinc-200">
              加好友
            </button>
          </form>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {friends.map((friend) => (
            <div key={friend.id} className="rounded border border-white/10 bg-black p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-white">{friend.nickname}</p>
                  <p className="text-sm font-bold text-zinc-500">{friend.username}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFriend(friend.id)}
                  className="rounded border border-white/10 px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-white hover:text-zinc-950"
                >
                  刪除
                </button>
              </div>
              <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                <input
                  type="number"
                  min="100"
                  step="100"
                  className="min-h-11 rounded border border-white/10 bg-zinc-950 px-3 text-sm font-bold text-white outline-none focus:border-white"
                  value={giftAmount}
                  onChange={(event) => setGiftAmount(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => handleGift(friend.id)}
                  className="rounded bg-white px-4 py-2 text-sm font-black text-zinc-950 transition hover:bg-zinc-200"
                >
                  贈送
                </button>
              </div>
            </div>
          ))}
          {friends.length === 0 && <p className="rounded border border-white/10 bg-black p-5 text-sm font-bold text-zinc-500">目前尚無好友</p>}
        </div>
      </section>
    </AppShell>
  )
}
