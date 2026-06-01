import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import DecorativeAsset from '../components/DecorativeAsset'
import { loginMember, registerMember } from '../store/slices/authSlice'
import { fetchRanks } from '../store/slices/rankSlice'
import { fetchWallet } from '../store/slices/walletSlice'
import { getBackgroundStyle } from '../theme/backgroundTheme'

const defaultLogin = { username: 'test', password: 'test1234' }
const defaultRegister = { username: '', nickname: '', email: '', password: '' }

export default function Member() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth)
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login'
  const [mode, setMode] = useState(initialMode)
  const [loginForm, setLoginForm] = useState(defaultLogin)
  const [registerForm, setRegisterForm] = useState(defaultRegister)
  const from = location.state?.from?.pathname || '/games'

  const pageCopy = useMemo(
    () =>
      mode === 'register'
        ? {
            eyebrow: 'Register',
            title: '建立會員帳號',
            submit: '建立帳號',
            switchText: '已有帳號，前往登入',
          }
        : {
            eyebrow: 'Sign In',
            title: '登入會員',
            submit: '登入',
            switchText: '尚未註冊，建立帳號',
          },
    [mode]
  )

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  useEffect(() => {
    if (isAuthenticated && location.state?.from) {
      navigate(from, { replace: true })
    }
  }, [from, isAuthenticated, location.state, navigate])

  const switchMode = () => {
    const nextMode = mode === 'login' ? 'register' : 'login'
    setSearchParams({ mode: nextMode })
    setMode(nextMode)
  }

  const handleLoginChange = (event) => {
    setLoginForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const handleRegisterChange = (event) => {
    setRegisterForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const syncAfterAuth = () => {
    dispatch(fetchWallet())
    dispatch(fetchRanks())
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    try {
      await dispatch(loginMember(loginForm)).unwrap()
      syncAfterAuth()
      navigate(from, { replace: true })
    } catch {
      // authSlice exposes the message in state.error
    }
  }

  const handleRegisterSubmit = async (event) => {
    event.preventDefault()
    try {
      await dispatch(registerMember(registerForm)).unwrap()
      syncAfterAuth()
      navigate(from, { replace: true })
    } catch {
      // authSlice exposes the message in state.error
    }
  }

  return (
    <div className="theme-background min-h-screen text-white" style={getBackgroundStyle('auth')}>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link to="/" className="font-black tracking-tight">
          幸運星幣城
        </Link>
        <Link to="/" className="rounded border border-white/20 px-4 py-2 text-sm font-black text-white hover:bg-white hover:text-zinc-950">
          回首頁
        </Link>
      </header>

      <main className="mx-auto grid max-w-7xl items-center gap-8 px-4 pb-12 pt-4 sm:px-6 lg:grid-cols-[1fr_520px] lg:px-8">
        <section className="grid gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-zinc-500">Member Access</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">會員頁是遊戲入口的門禁</h1>
            <p className="mt-5 max-w-2xl text-base font-bold leading-8 text-zinc-400">
              註冊或登入後，才能進入遊戲大全、各遊戲網頁與賭場商城。測試帳號 test / test1234 已預填，可直接登入檢查流程。
            </p>
          </div>
          <DecorativeAsset assetKey="memberHero" className="min-h-[340px]" />
        </section>

        <section className="rounded border border-white/10 bg-zinc-900 p-6">
          <div className="grid grid-cols-2 gap-2 rounded bg-black p-1">
            <button
              type="button"
              onClick={() => {
                setSearchParams({ mode: 'login' })
                setMode('login')
              }}
              className={[
                'rounded px-4 py-3 text-sm font-black transition',
                mode === 'login' ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:text-white',
              ].join(' ')}
            >
              登入
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchParams({ mode: 'register' })
                setMode('register')
              }}
              className={[
                'rounded px-4 py-3 text-sm font-black transition',
                mode === 'register' ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:text-white',
              ].join(' ')}
            >
              註冊
            </button>
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-zinc-500">{pageCopy.eyebrow}</p>
          <h2 className="mt-3 text-2xl font-black">{pageCopy.title}</h2>

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-zinc-300">
                帳號
                <input
                  name="username"
                  className="rounded border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white"
                  value={loginForm.username}
                  onChange={handleLoginChange}
                  autoComplete="username"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-zinc-300">
                密碼
                <input
                  name="password"
                  className="rounded border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              {error && <p className="rounded border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 rounded bg-white px-5 py-3 text-sm font-black text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? '登入中...' : pageCopy.submit}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-zinc-300">
                帳號
                <input
                  name="username"
                  className="rounded border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white"
                  placeholder="lucky-player"
                  value={registerForm.username}
                  onChange={handleRegisterChange}
                  minLength={3}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-zinc-300">
                暱稱
                <input
                  name="nickname"
                  className="rounded border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white"
                  placeholder="Lucky Player"
                  value={registerForm.nickname}
                  onChange={handleRegisterChange}
                  minLength={2}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-zinc-300">
                Email
                <input
                  name="email"
                  className="rounded border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white"
                  placeholder="player@example.com"
                  value={registerForm.email}
                  onChange={handleRegisterChange}
                  type="email"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-zinc-300">
                密碼
                <input
                  name="password"
                  className="rounded border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white"
                  value={registerForm.password}
                  onChange={handleRegisterChange}
                  type="password"
                  minLength={8}
                  pattern="(?=.*[A-Za-z])(?=.*\d).{8,}"
                  title="至少 8 碼，並包含英文與數字"
                  required
                />
              </label>
              {error && <p className="rounded border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 rounded bg-white px-5 py-3 text-sm font-black text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? '建立中...' : pageCopy.submit}
              </button>
            </form>
          )}

          <button type="button" onClick={switchMode} className="mt-5 w-full text-center text-sm font-bold text-zinc-400 transition hover:text-white">
            {pageCopy.switchText}
          </button>
        </section>
      </main>
    </div>
  )
}
