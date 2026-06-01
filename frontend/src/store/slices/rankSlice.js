import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { mockApi } from '../../services/mockApi'

const initialState = {
  globalRank: [],
  friendRank: [],
  dailyWinnings: [],
  myGlobalRank: null,
  activeTab: 'global',
  searchQuery: '',
  loading: false,
  error: null,
}

export const fetchRanks = createAsyncThunk('rank/fetchRanks', async (_, { rejectWithValue }) => {
  try {
    return await mockApi.getRank()
  } catch (error) {
    return rejectWithValue(error.message)
  }
})

const rankSlice = createSlice({
  name: 'rank',
  initialState,
  reducers: {
    setGlobalRank(state, action) {
      state.globalRank = action.payload
    },
    setFriendRank(state, action) {
      state.friendRank = action.payload
    },
    setDailyWinnings(state, action) {
      state.dailyWinnings = action.payload
    },
    setMyGlobalRank(state, action) {
      state.myGlobalRank = action.payload
    },
    setLoading(state, action) {
      state.loading = action.payload
    },
    setError(state, action) {
      state.error = action.payload
    },
    setRankTab(state, action) {
      state.activeTab = action.payload
    },
    setRankSearchQuery(state, action) {
      state.searchQuery = action.payload
    },
    upsertRankRows(state, action) {
      const incomingRows = action.payload.items || action.payload
      const merged = [...incomingRows, ...state.globalRank]
      const uniqueRows = Array.from(new Map(merged.map((row) => [row.id || row.nickname, row])).values())
      state.globalRank = uniqueRows.sort((a, b) => b.score - a.score).slice(0, 100)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRanks.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchRanks.fulfilled, (state, action) => {
        state.loading = false
        state.globalRank = action.payload.globalRank
        state.friendRank = action.payload.friendRank
        state.myGlobalRank = action.payload.myGlobalRank
      })
      .addCase(fetchRanks.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || '排行榜讀取失敗'
      })
  },
})

export const {
  setGlobalRank,
  setFriendRank,
  setDailyWinnings,
  setMyGlobalRank,
  setLoading,
  setError,
  setRankTab,
  setRankSearchQuery,
  upsertRankRows,
} = rankSlice.actions
export default rankSlice.reducer
