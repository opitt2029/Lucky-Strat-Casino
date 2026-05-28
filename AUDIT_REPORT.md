# Lucky Star Casino — 後端程式碼品質審計報告

> 審計日期：2026-05-28
> 最後驗證與更新：2026-05-28
> 審計範圍：所有 `backend/*/src/main/java` + `application.yml`
> Package root：`com.luckystar`
> Java 21 + Spring Boot 3.3.5
> Services：member-service (8081), gateway-service (8080), wallet-service (8082), game-service (8083), rank-service (8084), admin-service (8086)

---

## 🔍 驗證與修復狀態（2026-05-28 更新）

報告原始 34 項中經實際讀程式碼驗證後，狀態如下：

### ✅ 已修復（P0 + P1，2026-05-28 完成）

#### P0（HIGH，第一輪）

| # | 嚴重度 | 項目 | 修改檔案 |
|---|---|---|---|
| **#13** | HIGH | AvatarUrl SVG XSS — 改為 MIME 白名單（jpeg/png/gif/webp） | `member-service/.../validation/AvatarUrlValidator.java` |
| **#17** | HIGH | Gateway CORS localhost fallback — 改 `${VAR:?...}` 強制必填 | `gateway-service/.../resources/application.yml` |
| **#19** | HIGH | JWT role claim 遺漏導致 Gateway RBAC 失效 — `buildToken()` 補 role claim、`AuthService` 同步更新、refresh 重查 DB | `member-service/.../security/JwtTokenProvider.java`、`service/AuthService.java` |

#### P1（MED/HIGH，第二輪）

| # | 嚴重度 | 項目 | 修改檔案 |
|---|---|---|---|
| **#4** | MED | `AuthController.logout` 的 `Long.parseLong` 包 `try/catch` → 401 而非 500 | `member-service/.../controller/AuthController.java` |
| **#5** | MED | `PlayerService.updateProfile` 加 `@Transactional`；`getProfile` 加 `@Transactional(readOnly=true)` | `member-service/.../service/PlayerService.java` |
| **#11** | MED | `Member.passwordHash` 加 `@JsonIgnore` + Lombok `@ToString(exclude=...)` 雙層防禦 | `member-service/.../entity/Member.java` |
| **#14** | HIGH | auth 端點加 `RequestRateLimiter`（Spring Cloud Gateway 內建 RedisRateLimiter，5 req/sec, burst 10，by IP） | `gateway-service/.../config/RateLimitConfig.java`（新檔）、`resources/application.yml` |
| **#18** | MED | Gateway CORS `allowedHeaders` 從 `"*"` 改白名單 `[Authorization, Content-Type, X-Requested-With]` | `gateway-service/.../resources/application.yml` |
| **#21** | MED | 新增 `FilterOrder` 常數類，集中定義所有 GlobalFilter 的 order | `gateway-service/.../filter/FilterOrder.java`（新檔）、`JwtAuthenticationGlobalFilter.java` |
| **#24** | MED | Gateway Redis 黑名單查詢 fail-closed：`.onErrorResume` 視 Redis 故障為 token revoked | `gateway-service/.../filter/JwtAuthenticationGlobalFilter.java` |

詳見 `backend/member-service/CHANGELOG.md` 的 `[Security Audit P0]` 與 `[Security Audit P1]` 段落。

#### 新增環境變數（可選，gateway-service）
- `AUTH_RATE_LIMIT_REPLENISH`（預設 `5`）— 每秒補充 token 數
- `AUTH_RATE_LIMIT_BURST`（預設 `10`）— burst 容量上限

### ❌ 經驗證為誤判（不需修復）

| # | 原報告說 | 實際狀態 |
|---|---|---|
| #7 | Fat Controller 風險 | AuthController 完全委派 AuthService，無 token 邏輯 |
| #9 | `/internal/**` permitAll 繞過 | SecurityConfig 已用 `addFilterBefore` 確保 InternalSecretFilter 早於 Security chain 執行 |
| #10 | InternalSecretFilter timing attack | 已使用 `MessageDigest.isEqual()` |
| #12 | UpdateProfile Mass Assignment | DTO 僅含 nickname/avatar，無敏感欄位 |
| #15 | JWT secret 長度未驗證 | JJWT 0.12.6 `Keys.hmacShaKeyFor()` 內建 `WeakKeyException`，啟動即失敗 |
| #6 | Repository 輸入長度限制 | DTO 層已有 `@Size(max=50)`（LoginRequest/RegisterRequest） |

### ⚠️ 無對應程式碼可修（推論性項目）

wallet-service、game-service、rank-service、admin-service **目前僅有 `Application.java` 和少數 config**，沒有 Controller / Service / Entity 等業務邏輯實作。以下推論項目須等對應服務實作後再回頭審：

- #25 Wallet double-spend、#26 Outbox Pattern、#27 Wallet Kafka manual ack
- #30 game-service Kafka listener 無 try/catch
- #31 rank-service `consecutive_days` 時區問題
- #32 admin-service read replica 誤用、#33 admin-service Kafka manual ack
- #34 Redis 無密碼（屬基礎設施配置，非程式碼）
- #35 / #36 Kafka offset / retry 配置（屬基礎設施配置）
- #37 / #38 跨服務 tracing / 全域 Kafka manual ack

### ⏳ 剩餘 — 待修（P2 與 P3 技術債）

| 優先 | # | 嚴重度 | 項目 | 預估 |
|:---:|---|---|---|---|
| **P2** | #8 | MED | 所有 List 端點加 `Pageable` 參數（目前 member-service 的 list 端點尚未實作） | 對應端點實作時一併 |
| **P2** | #16 | LOW | Hikari `maximum-pool-size: 10` 評估上調至 15-20 | 依壓測結果 |
| **P3** | — | — | Refresh token rotation 已實作；可考慮加 token family 偵測重放 | 4 hr |
| **P3** | #37 | MED | 引入 Micrometer Tracing + Zipkin/Jaeger | 4 hr |

### 修正後的統計

| 項目 | 數量 |
|---|---|
| 原報告總計 | 34 |
| ✅ 已修復（P0 + P1） | 10（#4, #5, #11, #13, #14, #17, #18, #19, #21, #24） |
| ❌ 誤判 | 6（#6, #7, #9, #10, #12, #15） |
| ⚠️ 無對應程式碼（業務邏輯尚未實作） | 11（wallet/game/rank/admin/跨服務基礎設施） |
| ⏳ P2/P3 技術債 | 4 |
| 📋 其他低優先 / 推論 | 3 |

### 已知獨立議題（不在本次審計範圍）

- `member-service/src/test/.../AuthServiceLoginTest.java` 與 `RefreshTokenServiceTest.java` 引用不存在的 method（`setActive`、`getRefreshTokenExpiryMs`、`getMemberIdFromToken`），在本次修改前已編譯失敗，需另開 task 同步測試與 source schema

---

## 摘要統計

| 服務 | HIGH | MED | LOW | 小計 |
|------|:----:|:---:|:---:|:----:|
| member-service | 5 | 5 | 2 | **12** |
| gateway-service | 3 | 4 | 0 | **7** |
| wallet-service | 3 | 0 | 0 | **3** |
| game-service | 1 | 1 | 1 | **3** |
| rank-service | 1 | 0 | 0 | **1** |
| admin-service | 0 | 2 | 0 | **2** |
| 跨服務共通 | 3 | 3 | 0 | **6** |
| **總計** | **16** | **15** | **3** | **34** |

---

## member-service

### Category 1 — 硬編碼值

| # | 檔案 (path:line) | Severity | Category | 說明 | 修正方式 |
|---|---|---|---|---|---|
| 1 | `backend/member-service/src/main/resources/application.yml` | MED | 硬編碼值 | Redis host/port 使用 `${REDIS_HOST:localhost}` / `${REDIS_PORT:6379}`，有本機 fallback，若 env var 未設將連到 localhost Redis | 改為 `${REDIS_HOST:?REDIS_HOST is required}` 讓啟動失敗而非靜默用錯誤主機 |
| 2 | `backend/member-service/src/main/resources/application.yml` | LOW | 硬編碼值 | `datasource.url` 的 `serverTimezone=Asia/Taipei` 硬編在 URL 字串裡，時區應可外部化 | 將時區獨立為 `${DB_TIMEZONE:Asia/Taipei}` env var |

### Category 2 — 潛在 Bug

| # | 檔案 (path:line) | Severity | Category | 說明 | 修正方式 |
|---|---|---|---|---|---|
| 3 | `backend/member-service/src/main/java/com/luckystar/member/service/AuthService.java` | HIGH | 潛在 Bug | `login()` 無 `@Transactional`：先做 DB 查詢、再寫 Redis refresh token，Redis 失敗時登入仍返回成功但 token 根本沒存；使用者自認已登入卻無法 refresh | 加上 `@Transactional`，並在 Redis 失敗時讓方法拋出例外讓事務回滾（或用 try-finally 確保回滾語義） |
| 4 | `backend/member-service/src/main/java/com/luckystar/member/service/AuthService.java:101` | MED | 潛在 Bug | `Long.parseLong(claims.getSubject())` 未 catch `NumberFormatException`，JWT subject 若不是數字直接拋 500，應為 401 | `try { … } catch (NumberFormatException e) { throw new InvalidTokenException(…); }` |
| 5 | `backend/member-service/src/main/java/com/luckystar/member/service/PlayerService.java` | MED | 潛在 Bug | `updateProfile()` 無 `@Transactional`，中途失敗可能造成部分欄位已更新 | 加 `@Transactional` |
| 6 | `backend/member-service/src/main/java/com/luckystar/member/repository/MemberRepository.java` | LOW | 潛在 Bug | `findByUsername()` / `existsByUsername()` 無輸入長度限制；攻擊者可傳超大字串造成 index 掃描效能問題 | 在 DTO 層加 `@Size(max=50)` 驗證（`LoginRequest` 應已有，確認 `RegisterRequest` 亦套用） |

### Category 3 — 架構與設計

| # | 檔案 (path:line) | Severity | Category | 說明 | 修正方式 |
|---|---|---|---|---|---|
| 7 | `backend/member-service/src/main/java/com/luckystar/member/controller/AuthController.java` | MED | 架構 | 確認 token 建立邏輯是否全在 `AuthService`；若 Controller 直接呼叫 `JwtTokenProvider` 則為 Fat Controller | 所有 token 生成邏輯應封裝在 `AuthService` 中 |
| 8 | 所有 List 端點 | MED | 架構 | 好友列表、每日簽到記錄、任務定義等 List 端點若無 `Pageable` 參數，隨資料成長將全表掃描 | 所有 list 類方法加 `Page<T> findBy…(Pageable pageable)` 並設預設 `size=20` |

### Category 4 — 安全風險

| # | 檔案 (path:line) | Severity | Category | 說明 | 修正方式 |
|---|---|---|---|---|---|
| 9 | `backend/member-service/src/main/java/com/luckystar/member/config/SecurityConfig.java` | HIGH | 安全 | `.requestMatchers("/internal/**").permitAll()` — Spring Security 直接放行 `/internal/**`，即使 `InternalSecretFilter` 存在也可能被繞過（filter 必須在 Security chain 之前執行） | 移除 `permitAll()`，改讓 `InternalSecretFilter` 以 `OncePerRequestFilter` 攔截並提早 reject；或用 `addFilterBefore(internalSecretFilter, UsernamePasswordAuthenticationFilter.class)` 確保順序 |
| 10 | `backend/member-service/src/main/java/com/luckystar/member/security/InternalSecretFilter.java` | MED | 安全 | 確認 secret 比對是否用 constant-time `MessageDigest.isEqual()`；若直接用 `String.equals()` 則有 timing attack 風險 | 使用 `MessageDigest.isEqual(secret.getBytes(StandardCharsets.UTF_8), incoming.getBytes(StandardCharsets.UTF_8))` |
| 11 | `backend/member-service/src/main/java/com/luckystar/member/entity/Member.java` | HIGH | 安全 | `passwordHash` 欄位若未加 `@ToString.Exclude` + `@JsonIgnore`，Lombok 自動生成的 `toString()` 及 Jackson 序列化會洩露 hash | `@ToString.Exclude` 加在 `passwordHash` 欄位；`@JsonIgnore` 或在 DTO 層完全不映射此欄位 |
| 12 | `backend/member-service/src/main/java/com/luckystar/member/dto/UpdateProfileRequest.java` | HIGH | 安全 | Mass Assignment 風險：若 `UpdateProfileRequest` 包含 `isActive`、`passwordHash` 等欄位，前端可傳入修改 | DTO 只允許 `nickname`、`avatarUrl` 兩個欄位；後端用明確的 setter 而非 `BeanUtils.copyProperties` |
| 13 | `backend/member-service/src/main/java/com/luckystar/member/validation/AvatarUrlValidator.java` | HIGH | 安全 | `data:image/svg+xml;base64,...` 符合 `startsWith("data:image/")` 條件，但 SVG 可內嵌 `<script>` 執行 XSS | 白名單限制 MIME：只允許 `data:image/jpeg`、`data:image/png`、`data:image/gif`；另拒絕 `javascript:` scheme |
| 14 | Auth 端點 | HIGH | 安全 | `/api/v1/auth/login` 及 `/register` 無速率限制，可暴力破解 | 在 Gateway 加 `RequestRateLimiter` filter；或在 member-service 用 Bucket4j / Redis 計數，5次失敗鎖定 |

### Category 5 — 設定與環境

| # | 檔案 (path:line) | Severity | Category | 說明 | 修正方式 |
|---|---|---|---|---|---|
| 15 | `backend/member-service/src/main/resources/application.yml` | MED | 設定 | JWT_SECRET 用 `?` 語法強制必填（佳），但未驗證長度；空字串或 1 字元 secret 可通過 YAML 解析 | 在 `JwtTokenProvider` 的 `@PostConstruct` 中驗證 `secret.length() >= 32`，否則 `throw new IllegalStateException(…)` |
| 16 | `backend/member-service/src/main/resources/application.yml` | LOW | 設定 | Hikari `maximum-pool-size: 10`；member-service 同時處理 auth 與 profile 讀取，尖峰可能不足 | 評估是否需調至 15-20；並設 `minimum-idle: 5` |

---

## gateway-service

### Category 1 — 硬編碼值

| # | 檔案 (path:line) | Severity | Category | 說明 | 修正方式 |
|---|---|---|---|---|---|
| 17 | `backend/gateway-service/src/main/resources/application.yml` | HIGH | 硬編碼值 | `allowedOrigins: ${CORS_ALLOWED_ORIGINS:http://localhost:5173}` — 未設 env var 時 CORS 放行 localhost，生產環境若漏設將允許錯誤來源 | 改為 `${CORS_ALLOWED_ORIGINS:?CORS_ALLOWED_ORIGINS is required}`，強制設定 |
| 18 | `backend/gateway-service/src/main/resources/application.yml` | MED | 硬編碼值 | `allowedHeaders: "*"` 加上 `allowCredentials: true`：瀏覽器規範禁止 wildcard + credentials 同時使用，部分瀏覽器會直接拒絕 | 改為明確列表：`[Authorization, Content-Type, X-Requested-With]` |

### Category 2 — 潛在 Bug

| # | 檔案 (path:line) | Severity | Category | 說明 | 修正方式 |
|---|---|---|---|---|---|
| 19 | `backend/gateway-service/src/main/java/com/luckystar/gateway/filter/JwtAuthenticationGlobalFilter.java` | HIGH | 潛在 Bug | JWT claims 中 `role` 從未在 `JwtTokenProvider.buildToken()` 寫入，但 Gateway 嘗試讀取 `claims.get("role")`，永遠為 null；下游服務收到空的 `X-User-Role` header，RBAC 形同虛設 | `JwtTokenProvider.buildToken()` 加入 `.claim("role", memberRole)`；Gateway filter 讀出後做 null check |
| 20 | `backend/gateway-service/src/main/java/com/luckystar/gateway/filter/JwtAuthenticationGlobalFilter.java:76` | MED | 潛在 Bug | `claims.getId()` / `claims.getSubject()` 若為 null 未完整防衛，empty header 傳遞給下游服務後可能造成 NPE | 用 `Optional.ofNullable()` 包裝；若關鍵 claim 缺失直接回 401 |

### Category 3 — 架構與設計

| # | 檔案 (path:line) | Severity | Category | 說明 | 修正方式 |
|---|---|---|---|---|---|
| 21 | `backend/gateway-service/src/main/java/com/luckystar/gateway/filter/JwtAuthenticationGlobalFilter.java:112` | MED | 架構 | `getOrder()` 回傳 `-100` 但未文件化與其他全域 filter（CORS、rate limiter）的相對順序 | 建立 `FilterOrder` 常數類，明確定義所有 filter 的 order 並加上 Javadoc 說明執行鏈 |
| 22 | Gateway routes | LOW | 架構 | 若各微服務間存在直接 HTTP call（不過 gateway），將繞過 JWT 驗證；需確認 game-service 呼叫 wallet-service 是否走 gateway | 統一用 `X-Internal-Secret` header 的 internal call pattern，不繞 gateway |

### Category 4 — 安全風險

| # | 檔案 (path:line) | Severity | Category | 說明 | 修正方式 |
|---|---|---|---|---|---|
| 23 | `backend/gateway-service/src/main/resources/application.yml` | HIGH | 安全 | JWT_SECRET 需與 member-service 共用，但若兩邊用不同的 env var 名稱或值，token 驗證將失敗；需確認完全一致且無任何 fallback default | 兩邊都使用 `${JWT_SECRET:?...}` 且無 fallback；在 CI/CD pipeline 中以同一個 secret source 注入 |

### Category 5 — 設定與環境

| # | 檔案 (path:line) | Severity | Category | 說明 | 修正方式 |
|---|---|---|---|---|---|
| 24 | `backend/gateway-service/src/main/resources/application.yml` | MED | 設定 | Redis timeout 2000ms：token blacklist check 超時後的行為應是 **fail-closed**（拒絕請求），需確認 filter 中 Redis 錯誤是否正確處理 | 在 `.onErrorResume()` 中對 Redis 逾時回傳 401，而非讓請求通過；或加 Circuit Breaker |

---

## wallet-service

### Category 2 — 潛在 Bug

| # | 檔案 (path:line) | Severity | Category | 說明 | 修正方式 |
|---|---|---|---|---|---|
| 25 | wallet-service 轉帳/扣款邏輯 | HIGH | 潛在 Bug | **Double-spend 風險**：Redis 餘額 check 與 DB debit 之間無原子性；兩個並發請求可能都通過 balance check 再各自扣款 | 使用 Redis `WATCH/MULTI/EXEC` 或 DB 層的 `SELECT … FOR UPDATE` 加悲觀鎖；或用 DB 唯一約束 + 樂觀鎖的 version 欄位 |
| 26 | wallet-service Kafka publish | HIGH | 潛在 Bug | DB debit 與 Kafka publish 若不在同一 transaction boundary，DB 成功但 Kafka 失敗時事件丟失，餘額已扣但下游不知道 | 使用 **Outbox Pattern**：先寫 DB + outbox table（同一 transaction），再由 Debezium/Polling publisher 發 Kafka |

### Category 5 — 設定與環境

| # | 檔案 (path:line) | Severity | Category | 說明 | 修正方式 |
|---|---|---|---|---|---|
| 27 | `backend/wallet-service/src/main/resources/application.yml` | HIGH | 設定 | `enable-auto-commit: false` 但若無明確 `consumer.commitSync()` / `Acknowledgment.acknowledge()` 呼叫，消息永遠不 commit，造成重複消費 | 確認每個 `@KafkaListener` 方法參數包含 `Acknowledgment ack`，並在成功處理後呼叫 `ack.acknowledge()` |

---

## game-service

### Category 1 — 硬編碼值

| # | 檔案 (path:line) | Severity | Category | 說明 | 修正方式 |
|---|---|---|---|---|---|
| 28 | `backend/game-service/src/main/resources/application.yml` | MED | 硬編碼值 | `wallet-service.base-url: ${WALLET_SERVICE_URL:http://localhost:8082}` — 有 localhost fallback；服務拓撲洩漏 | 改為 `${WALLET_SERVICE_URL:?WALLET_SERVICE_URL is required}` |
| 29 | `backend/game-service/src/main/resources/application.yml` | LOW | 硬編碼值 | Internal call 使用 HTTP 而非 HTTPS，生產環境中 internal traffic 若不加密，secret header 明文傳輸 | 生產環境統一用 HTTPS；或部署在同一 VPC 用 mTLS |

### Category 2 — 潛在 Bug

| # | 檔案 (path:line) | Severity | Category | 說明 | 修正方式 |
|---|---|---|---|---|---|
| 30 | game-service `@KafkaListener` 方法 | HIGH | 潛在 Bug | `@KafkaListener` 方法無 try/catch，業務邏輯異常將導致消費者重試無限循環；若未配置 Dead Letter Topic，消息直接丟失 | 加 `try/catch` + `@RetryableTopic(attempts=3, dltTopicSuffix="-dlt")`；配置 DLT consumer |

---

## rank-service

### Category 2 — 潛在 Bug

| # | 檔案 (path:line) | Severity | Category | 說明 | 修正方式 |
|---|---|---|---|---|---|
| 31 | `daily_checkins.consecutive_days` 重置邏輯 | HIGH | 潛在 Bug | `consecutive_days` 重置依賴伺服器時間，但 datasource URL 設定 `serverTimezone=Asia/Taipei`；若 JVM 時區與 DB 時區不一致（JVM 預設 UTC），跨午夜邊界的判斷會差 8 小時，導致連續天數誤算 | JVM 啟動時明確設 `-Duser.timezone=Asia/Taipei`；或全部用 UTC 儲存並只在顯示層轉換 |

---

## admin-service

### Category 3 — 架構與設計

| # | 檔案 (path:line) | Severity | Category | 說明 | 修正方式 |
|---|---|---|---|---|---|
| 32 | `backend/admin-service/src/main/java/com/luckystar/admin/config/DataSourceConfig.java` | MED | 架構 | admin-service 連接 PostgreSQL read replica；需確認寫操作是否誤用了 read replica datasource（尤其雙 DataSource 配置容易弄錯 `@Primary`） | 在 `DataSourceConfig` 明確標記 primary/secondary；寫操作的 `@Transactional` 加上 `readOnly=false` 防呼叫到 replica |

### Category 5 — 設定與環境

| # | 檔案 (path:line) | Severity | Category | 說明 | 修正方式 |
|---|---|---|---|---|---|
| 33 | `backend/admin-service/src/main/resources/application.yml` | MED | 設定 | `enable-auto-commit: false` 同上（#27），需確認 manual ack 實作 | 每個 `@KafkaListener` 加 `Acknowledgment ack` 參數並在 `finally` block 呼叫 `ack.acknowledge()` |

---

## 跨服務共通問題

| # | 影響服務 | Severity | Category | 說明 | 修正方式 |
|---|---|---|---|---|---|
| 34 | 所有服務 | HIGH | 安全 | Redis 無密碼設定；攻擊者若進入內網可直接讀取 refresh token、操作 blacklist 繞過 token 撤銷 | 所有 `application.yml` 加 `password: ${REDIS_PASSWORD:?Redis password required}`；Redis 層啟用 `requirepass` |
| 35 | 所有服務 | HIGH | 設定 | Kafka `auto-offset-reset: earliest`：consumer group offset 遺失時將重播所有歷史消息，財務類事件（扣款、獎勵）重播將造成資料損壞 | 改為 `latest`；並實作冪等消費（deduplication key）以應對正常重試 |
| 36 | 所有服務 | MED | 設定 | Kafka producer `retries: 3` 無 backoff 設定，Broker 重啟瞬間所有服務同時打爆 Broker | 加 `retry.backoff.ms: 100`、`max.block.ms: 60000`；考慮 Resilience4j Circuit Breaker |
| 37 | 所有服務 | MED | 安全 | 所有服務無分散式 tracing（Micrometer Tracing），出問題時無法追蹤跨服務呼叫鏈 | 引入 Micrometer Tracing + Zipkin/Jaeger；在 `application.yml` 加 `management.tracing.sampling.probability: 1.0` |
| 38 | 所有 Kafka consumer 服務 | HIGH | 設定 | `enable-auto-commit: false` 全部配置但無法確認 `Acknowledgment.acknowledge()` 實作是否存在；這是最高風險的遺漏 | 每個 `@KafkaListener` 加 `Acknowledgment ack` 參數並在 `finally` block 呼叫 `ack.acknowledge()` |

---

## 特別標注：高風險推論點（Schema 邏輯推論）

### 友誼自我申請（Friendship Self-Request）

資料表有 `CHECK (requester_id <> receiver_id)`，但 Service 層需也驗證。

**風險**：若 Service 層無前置檢查，攻擊者傳 `requester_id == receiver_id` 雖被 DB 拒絕，但每次都打到 DB 才失敗；若未來 DB 約束被誤刪，Service 層毫無防線。

**建議修正**：
```java
// FriendshipService.createRequest() 最頂端
if (requesterId.equals(receiverId)) {
    throw new BadRequestException("Cannot send friend request to yourself");
}
```

### 連續簽到時區問題

`consecutive_days` 重置邏輯 + Asia/Taipei timezone + JVM 可能為 UTC 的組合。

**風險**：Asia/Taipei 為 UTC+8，若 JVM 用 UTC，台灣時間 00:00（新的一天）JVM 仍認為是昨天 16:00，「昨天有無簽到」判斷會誤算，連續天數可能在不該重置時重置。

**建議修正**：
```yaml
# docker-compose.yml 或 JVM 啟動參數
environment:
  JAVA_TOOL_OPTIONS: -Duser.timezone=Asia/Taipei
```

或在程式碼中統一用 UTC 儲存，只在顯示層轉換時區。

---

## 修復優先順序（原始版本 — 已被頂部「驗證與修復狀態」段取代）

> ⚠️ 此表為 2026-05-28 初版審計結果，未經驗證；當前實際狀態請見頂部「🔍 驗證與修復狀態」段落。

| 優先級 | # | 項目 | 預估工時 |
|--------|---|------|----------|
| **P0 — 上線前必修** | 9 | `/internal/**` permitAll 繞過 | 30 min |
| **P0** | 19 | JWT role claim 遺漏 → RBAC 失效 | 1 hr |
| **P0** | 38 | Kafka manual ack 確認實作 | 2 hr |
| **P0** | 25 | Wallet double-spend 防護 | 4 hr |
| **P0** | 35 | Kafka offset reset 改 `latest` | 15 min |
| **P1 — 本週修完** | 34 | Redis 加密碼 | 30 min |
| **P1** | 11 | passwordHash `@ToString.Exclude` | 15 min |
| **P1** | 12 | Mass Assignment DTO 限縮 | 1 hr |
| **P1** | 13 | AvatarUrl SVG XSS 修正 | 30 min |
| **P1** | 14 | 登入端點速率限制 | 2 hr |
| **P1** | 17 | CORS origin 移除 localhost fallback | 15 min |
| **P1** | 31 | 時區統一（`-Duser.timezone=Asia/Taipei`） | 30 min |
| **P2 — 本 Sprint** | 3, 5 | 補 `@Transactional` | 1 hr |
| **P2** | 8 | List 端點加 Pagination | 3 hr |
| **P2** | 26 | Outbox Pattern（Kafka + DB 原子性） | 8 hr |
| **P3 — 技術債** | 37 | 分散式 Tracing | 4 hr |
| **P3** | — | Refresh token rotation 防 token 竊取 | 4 hr |

---

## 技術棧參考

```
Java 21 + Spring Boot 3.3.5
Spring Web / JPA / Security / Redis / Kafka / Spring Cloud Gateway
JJWT 0.12.6 (jjwt-api + jjwt-impl + jjwt-jackson)
MySQL (CQRS write + query)
PostgreSQL (admin read replica)
Auth: JWT (access + refresh token) via gateway filter
Internal calls: X-Internal-Secret header → InternalSecretFilter
```
