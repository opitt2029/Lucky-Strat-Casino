import api from './api'

// 封裝對 wallet-service / member-service（透過 Gateway）真實 API 的呼叫
export const walletApi = {
  // GET /api/v1/wallet/balance → 回傳目前餘額
  async getBalance() {
    const res = await api.get('/api/v1/wallet/balance')
    const data = res.data.data
    return {
      balance: data.balance,
      frozenAmount: data.frozenAmount,
      availableBalance: data.availableBalance,
    }
  },

  // POST /api/v1/wallet/daily-checkin（端點實作在 member-service）
  // 注意：簽到回應只含 rewardAmount / consecutiveDays，不含最新餘額，
  // 因此簽到成功後再查一次餘額，組成 walletSlice 期望的 { reward, wallet } 形狀。
  async dailyCheckIn() {
    const res = await api.post('/api/v1/wallet/daily-checkin')
    const data = res.data.data
    const wallet = await walletApi.getBalance()
    return {
      reward: data.rewardAmount,
      consecutiveDays: data.consecutiveDays,
      wallet,
    }
  },
}
