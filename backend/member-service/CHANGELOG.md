# Changelog — member-service

> 🧊 **本檔已凍結為歷史紀錄（2026-05-29 起）。**
> 全專案改用單一的根目錄 [`/CHANGELOG.md`](../../CHANGELOG.md) 作為唯一 CHANGELOG，**新條目請寫在那裡**，勿在本檔新增。
> 詳見 [CONTRIBUTING.md §6](../../CONTRIBUTING.md) 與 [AGENTS.md §3](../../AGENTS.md)。本檔保留作為 member-service 早期開發的歷史參考。

All notable changes to member-service are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [T-019] — 2026-05-28 — Kafka 契約修復 + DLT + Transactional Outbox

### Context
架構審查發現 `member.registered` 的 producer/consumer 契約不一致導致新人禮金鏈路從未端到端跑通，
並缺乏毒丸訊息防護與 DB↔Kafka 原子性。本次修復分三部分。

### Fixed — producer/consumer 契約（嚴重）
- `service/AuthService.java`
  - 原 `kafkaTemplate.send("member.registered", String.valueOf(id))` 實際把 id 當成 **value** 送出（key 為 null），
    consumer 端 `objectMapper.readValue(...)` 永遠解析失敗 → 不 ack → 毒丸訊息卡死 partition、新人禮金永不發放
  - 改為送出與 `MemberRegisteredEvent` 契約一致的完整 JSON，並用 `(topic, key, value)` 三參數版本
- `consumer/MemberRegisteredConsumer.java`
  - 移除自行 try-catch 吞例外的邏輯，失敗直接拋例外交給 `DefaultErrorHandler`

### Added — Kafka 錯誤處理 + DLT
- `config/KafkaConfig.java`（新）
  - `DefaultErrorHandler`：暫時性錯誤重試 3 次（間隔 2 秒），`JsonProcessingException` / `IllegalArgumentException`
    等格式類錯誤不重試直接送 DLT；`DeadLetterPublishingRecoverer` 送往 `<topic>.DLT`
  - `ConcurrentKafkaListenerContainerFactory` 維持 `MANUAL_IMMEDIATE` 手動 ack
- `config/JwtFilterConfig.java`：`@EnableKafka` 移出至 `KafkaConfig`（職責分離）

### Added — Transactional Outbox Pattern
- `database/mysql/migration/V3__create_outbox_events.sql`：`outbox_events` 表（topic/kafka_key/payload/status/retry_count）
- `entity/OutboxEvent.java`、`repository/OutboxEventRepository.java`（撈 PENDING）
- `service/OutboxService.java`：`save(topic, key, payload)` 沿用呼叫端交易寫入 PENDING 事件（刻意不開新交易）
- `service/OutboxPoller.java`：`@Scheduled` 輪詢 PENDING → 同步等 broker 確認 → 標記 SENT / 失敗累加 retry
- `MemberServiceApplication.java`：加 `@EnableScheduling`
- `application.yml`：producer 加 `acks: all` + `enable.idempotence`；新增 `outbox.poll-interval-ms`（預設 5000）

### Modified — 三個 producer 改走 Outbox
- `AuthService.register`（加 `@Transactional`）、`NewGiftService`、`CheckinService`
  - `kafkaTemplate.send(...)` 改為 `outboxService.save(...)`，事件與業務資料同一交易
  - 移除原 best-effort / fail-fast 的 try-catch：DB 寫入與事件投遞改為原子綁定

### Tests
- 更新 `MemberRegisteredConsumerTest`（斷言例外往上拋而非吞掉）
- 更新 `AuthServiceTest` / `NewGiftServiceTest` / `CheckinServiceTest`：改 mock `OutboxService`，
  新增「outbox 失敗會往上拋」案例取代舊的 best-effort 斷言
- 新增 `OutboxPollerTest`（投遞成功→SENT / 失敗→保持 PENDING 且 retry+1 / 無 PENDING→不碰 Kafka）
- 修復 3 個 pre-existing 編譯失敗測試（對齊現行 API）：
  - `AuthServiceLoginTest` / `RefreshTokenServiceTest`：三參數 token API、`getClaims`、`getRemainingTtlMs`、`status` 欄位
  - `InternalSecretFilterTest`：建構子注入 secret
- 全套件 69 tests 通過

### Fixed — members schema 對齊 entity（解決 ddl-auto=validate 啟動失敗）
- `database/mysql/migration/V4__align_members_with_entity.sql`（新）
  - 補 `role` 欄位（V1 完全缺漏；RBAC / JWT role claim 必需）
  - `is_active`(BOOLEAN) → `status`(VARCHAR)，含資料轉換 `TRUE→'ACTIVE'` / `FALSE→'DISABLED'`
  - `avatar_url`(VARCHAR 500) → `avatar`(TEXT)
  - `nickname` 對齊 entity 改為 `NOT NULL`（register 以 `@NotBlank` 強制帶 nickname）
  - 不修改已套用的 V1，改以 V4 ALTER（遵守 Flyway checksum 規範）
- 驗證：grep 確認無程式碼殘留引用 `is_active` / `avatar_url`（搜到的 isActive 皆屬 task_definitions）；
  postgres migration 無 members 表（members 僅為 MySQL 寫入端），故只需改 MySQL

### Known Issues / 後續
- **DLT topic 需預建**：production 應手動建立 `member.registered.DLT`（partition 數對齊原 topic）
- **OutboxPoller 多實例**：目前未對撈出列加鎖，多副本部署需改用 `FOR UPDATE SKIP LOCKED` 或 ShedLock

---

## [T-018] — 2026-05-28 — New Player Gift Kafka Consumer

### Added
- `dto/MemberRegisteredEvent.java` — Kafka 事件反序列化 record（playerId / username / email）
- `service/NewGiftService.java` — `@Transactional processNewGift(Long playerId)`
  - Step 1：`findById` 找不到玩家 → log warn + return（不拋例外）
  - Step 2：`isNewGiftClaimed == true` → log info + return（不呼叫 save 或 send）
  - Step 3：`setIsNewGiftClaimed(true)` + `save` — 必須在 Kafka send **之前**完成
  - Step 4：發布 `wallet.credit` 事件（topic / key / JSON payload），失敗包成 `RuntimeException` 上拋
  - Step 5：log info "New gift dispatched"
- `consumer/MemberRegisteredConsumer.java` — `@KafkaListener(topics = "member.registered")`
  - 成功：`processNewGift` → `ack.acknowledge()`
  - 失敗：log error，**不 ack**，讓 Kafka 重投遞

### Modified
- `entity/Member.java`
  - 補加 `isNewGiftClaimed` 欄位（DB schema `is_new_gift_claimed BOOLEAN NOT NULL DEFAULT FALSE` 已存在，entity 於 T-014 rebuild 時漏加）
- `config/JwtFilterConfig.java`
  - 加入 `@EnableKafka`（全專案唯一，未存在於任何既有 `@Configuration`）

### Tests Added
- `service/NewGiftServiceTest.java` — 5 個 Mockito 測試
  - 找不到 member → never save / never send（×1）
  - 已領取 → never save / never send（×1）
  - 正常流程 → setIsNewGiftClaimed(true)、save once、send once（×1）
  - idempotencyKey 格式驗證 `"new-gift-{playerId}"`（×1）
  - Kafka send 拋 RuntimeException → save 已在 throw 前被呼叫一次（×1）
- `consumer/MemberRegisteredConsumerTest.java` — 3 個 Mockito 測試
  - 合法 JSON → processNewGift 以正確 playerId 呼叫、ack.acknowledge() 呼叫一次（×1）
  - 格式錯誤 JSON（JsonProcessingException）→ never processNewGift、never ack（×1）
  - processNewGift 拋例外 → never ack（×1）

### Implementation Notes
- **交易與 Kafka 一致性**：`save` 在 Kafka send 之前執行；若 Kafka send 失敗，`RuntimeException` 上拋觸發 `@Transactional` 回滾，`isNewGiftClaimed` 恢復 `false`，consumer 不 ack，Kafka 重投遞後重試整個流程。這確保「DB 寫入成功 ↔ Kafka 事件發出」一致，非靜默忽略失敗
- **防重複發放（雙重防線）**：DB `isNewGiftClaimed` 防止 member-service 重複發送；wallet.credit 的 `idempotencyKey: "new-gift-{playerId}"` 防止 Wallet Service 重複入帳
- **不拋例外的設計選擇（Step 1）**：找不到 member 時 log warn 後 return，而非拋例外。因為 Kafka consumer 找不到 member 拋例外會觸發無限重投遞；此場景屬資料不一致（member 尚未寫入），靜默 skip 更安全

---

## [T-017] — 2026-05-28 — Daily Check-in API

### Added
- `entity/DailyCheckin.java` — `@Entity @Table("daily_checkins")`；`@PrePersist` 自動設 `createdAt`；`checkinDate` 型別 `LocalDate`
- `repository/DailyCheckinRepository.java`
  - `findByPlayerIdAndCheckinDate` — 今日重複簽到防護
  - `findTopByPlayerIdOrderByCheckinDateDesc` — 取最近一筆計算連續天數
- `dto/CheckinResponse.java` — checkinId / checkinDate / consecutiveDays / rewardAmount
- `service/CheckinService.java` — `@Transactional checkin(Long playerId)`
  - 時區：`LocalDate.now(ZoneId.of("Asia/Taipei"))`
  - 重複簽到 → `AlreadyCheckedInException`（409）
  - 昨天有記錄 → `consecutiveDays = last + 1`；否則 → `1`
  - Kafka send 包在 try-catch，失敗只 log，不 rollback（best-effort）
  - 固定獎勵金額：50
- `controller/CheckinController.java` — `POST /api/v1/wallet/daily-checkin`（200）；playerId 從 JWT 取得
- `exception/AlreadyCheckedInException.java` — HTTP 409

### Modified
- `exception/GlobalExceptionHandler.java`
  - 追加 `handleAlreadyCheckedIn`（HTTP 409）

### Tests Added
- `service/CheckinServiceTest.java` — 6 個 Mockito 測試
  - 今日已簽到 → AlreadyCheckedInException（×1）
  - 無歷史記錄 → consecutiveDays = 1（×1）
  - 昨天有記錄 → consecutiveDays = lastRecord + 1（×1）
  - 2 天前有記錄（gap）→ consecutiveDays = 1（×1）
  - Kafka send 拋例外 → 仍回傳 CheckinResponse（×1）
  - idempotencyKey 格式驗證 `"checkin-{playerId}-{date}"`（×1）

### Implementation Notes
- **Kafka 策略與 T-018 的差異**：CheckinService 的 Kafka send 為 best-effort（try-catch 吞掉錯誤），因為簽到記錄本身已入庫；wallet.credit 的 `idempotencyKey: "checkin-{playerId}-{date}"` 是最後防線。NewGiftService（T-018）則選擇讓 Kafka 失敗觸發回滾與重試，因為新人禮金只應發放一次且較為關鍵
- **連假天數計算邏輯**：以 `LocalDate.equals(today.minusDays(1))` 精確比對，任何非「昨天」情況（首次、中斷）均重設為 1

---

## [T-016] — 2026-05-28 — Task System 資料層

### Added
- `entity/TaskType.java` — enum：`FIRST_LOGIN` / `DAILY_CHECKIN` / `BET_COUNT` / `INVITE_FRIEND`
- `entity/TaskDefinition.java` — `@Entity @Table("task_definitions")`；`taskCode` 唯一索引；`taskType` 以 `@Enumerated(EnumType.STRING)` 儲存
- `entity/PlayerTask.java` — `@Entity @Table("player_tasks")`；`@ManyToOne(fetch = FetchType.LAZY)` 關聯 `TaskDefinition`
- `repository/TaskDefinitionRepository.java`
  - `findByTaskCode(String)` — 依唯一碼查詢單筆
  - `findByTaskTypeAndIsActive(TaskType, Boolean)` — 依任務類型 + 啟用狀態篩選
  - `findByIsActive(Boolean)` — 列出所有啟用/停用任務
- `repository/PlayerTaskRepository.java`
  - `findByPlayerIdAndTaskDefinition_Id(Long, Long)` — 精確比對玩家 + 任務 ID
  - `findByPlayerId(Long)` — 查詢玩家全部任務進度
  - `findByPlayerIdAndTaskDefinition_TaskCode(Long, String)` — 跨關聯以 taskCode 查詢
- `exception/TaskDefinitionNotFoundException.java` — HTTP 404
- `exception/PlayerTaskNotFoundException.java` — HTTP 404
- `database/mysql/migration/V2__seed_task_definitions.sql` — 8 筆預設任務種子資料（`ON DUPLICATE KEY UPDATE` 確保冪等）
- `src/test/resources/application.yml` — 覆寫 `spring.jpa.properties.hibernate.dialect: H2Dialect`，避免 `@DataJpaTest` 套用 MySQL Dialect 導致 schema 建立失敗

### Modified
- `exception/GlobalExceptionHandler.java`
  - 追加 `handleTaskDefinitionNotFound`（HTTP 404）
  - 追加 `handlePlayerTaskNotFound`（HTTP 404）
- `pom.xml`
  - 追加 `com.h2database:h2` test scope，供 `@DataJpaTest` 內嵌資料庫使用

### Tests Added
- `repository/TaskDefinitionRepositoryTest.java` — 4 個 `@DataJpaTest` 測試
  - `findByTaskCode` 存在 / 不存在各一
  - `findByIsActive(true)` — 2 筆 active + 1 筆 inactive，只回傳 active
  - `findByTaskTypeAndIsActive(DAILY_CHECKIN, true)` — 只回傳 DAILY_CHECKIN 類型
- `repository/PlayerTaskRepositoryTest.java` — 3 個 `@DataJpaTest` 測試，`@BeforeEach` 先建立 `TaskDefinition` 前置資料
  - `findByPlayerIdAndTaskDefinition_Id` — 儲存後可正確取回
  - `findByPlayerIdAndTaskDefinition_TaskCode` — 正確玩家 + code → 非空
  - `findByPlayerIdAndTaskDefinition_TaskCode` — 錯誤 playerId → 空

### Implementation Notes
- **`@DataJpaTest` 切片行為**：預設 `Replace.ANY` 以 H2 替換 MySQL datasource，並自動套用 `ddl-auto=create-drop`。Security / JWT beans 不在 JPA slice 內，因此 `JWT_SECRET` / `INTERNAL_SECRET` 的 `?` 強制環境變數限制不會被觸發
- **種子資料冪等性**：採用 `ON DUPLICATE KEY UPDATE` 而非 `INSERT IGNORE`，確保未來任務定義有異動時重跑 migration 能同步更新欄位值
- **Lazy Loading 測試**：`PlayerTask.taskDefinition` 為 `LAZY`，測試透過 `TestEntityManager.persistAndFlush` 在同一 Session 內操作，不觸發 `LazyInitializationException`
- **本 task 無 Controller**：僅交付資料層（Entity / Repository / Exception），Service 與 API 端點由後續 task 實作

---

## [T-015] — 2026-05-28 — Friendship System API

### Added
- `entity/FriendshipStatus.java` — enum：`PENDING` / `ACCEPTED` / `REJECTED`
- `entity/Friendship.java` — `@Entity @Table("friendships")`；`@PrePersist` / `@PreUpdate` 自動設時間戳
- `repository/FriendshipRepository.java` — 雙向好友查詢 + JPQL `countAcceptedFriends` / `findAcceptedFriends`；`findByReceiverIdAndStatus`
- `dto/FriendRequestDto.java` — `@NotNull receiverId`
- `dto/FriendshipResponse.java` — 好友關係操作通用回應（id / requesterId / receiverId / status / timestamps）
- `dto/FriendListResponse.java` — 好友列表元素（friendshipId / friendId / username / nickname / avatarUrl / friendSince）
- `service/FriendshipService.java` — 5 個業務方法
  - `sendFriendRequest`：自我請求防護 → receiver 存在驗證 → 200 人上限 → 雙向重複檢查 → REJECTED 記錄復活為 PENDING
  - `acceptFriendRequest`：receiver 身分驗證 → PENDING 狀態驗證 → receiver 人數上限 → 設為 ACCEPTED
  - `rejectFriendRequest`：receiver 身分驗證 → PENDING 狀態驗證 → 設為 REJECTED
  - `listFriends`：雙向查詢 ACCEPTED 記錄 → `findAllById` 批次撈 Member 資料 → 組 FriendListResponse
  - `deleteFriend`：任一方身分驗證 → ACCEPTED 狀態驗證 → 刪除記錄
- `controller/FriendshipController.java` — 5 個 REST 端點，基底路徑 `/api/v1/friends`

| Method | Path | 成功 HTTP |
|--------|------|-----------|
| POST | `/api/v1/friends/request` | 201 |
| PUT | `/api/v1/friends/{friendshipId}/accept` | 200 |
| PUT | `/api/v1/friends/{friendshipId}/reject` | 200 |
| GET | `/api/v1/friends` | 200 |
| DELETE | `/api/v1/friends/{friendshipId}` | 200 |

- `exception/SelfFriendRequestException.java` — HTTP 400
- `exception/FriendLimitExceededException.java` — HTTP 400（上限 200 人）
- `exception/FriendshipAlreadyExistsException.java` — HTTP 409
- `exception/FriendshipNotFoundException.java` — HTTP 404
- `exception/ForbiddenOperationException.java` — HTTP 403
- `exception/InvalidFriendshipStatusException.java` — HTTP 400

### Modified
- `exception/GlobalExceptionHandler.java`
  - 追加 6 個 `@ExceptionHandler`（對應上方 6 個新 exception）；原有內容未異動

### Tests Added
- `service/FriendshipServiceTest.java` — 14 個單元測試（`@ExtendWith(MockitoExtension.class)`）
  - `sendFriendRequest`：自我請求（×1）、receiver 不存在（×1）、人數超限（×1）、已是好友（×1）、REJECTED 復活（×1）、正常新建（×1）
  - `acceptFriendRequest`：非 receiver（×1）、非 PENDING 狀態（×1）、正常接受（×1）
  - `rejectFriendRequest`：正常拒絕（×1）
  - `deleteFriend`：非當事人（×1）、PENDING 狀態（×1）、正常刪除（×1）
  - `listFriends`：雙向好友各一筆，回傳 2 筆且 friendId 正確（×1）

### Security Notes
- playerId 從 JWT SecurityContext（`authentication.getName()`）取得，不接受 path variable 或 request body 傳入
- 好友人數上限 200：requester 在發送時檢查，receiver 在接受時檢查，兩端均有保護
- `deleteFriend` 限 ACCEPTED 好友才能刪除，PENDING / REJECTED 狀態均拒絕，防止繞過拒絕機制
- 所有端點由 `SecurityConfig` 既有的 `.anyRequest().authenticated()` 規則覆蓋，無需修改 SecurityConfig

---

## [Security Audit P1] — 2026-05-28 — P1 安全與穩定性修復（7 項）

### Context
延續同日 `[Security Audit P0]` 修復，本次處理所有實際存在的 P1 項目。
跨 `member-service` 與 `gateway-service` 兩個服務。

### Fixed (member-service)
- **#4 剩餘 — `AuthController.logout` 的 `Long.parseLong` 未 catch（MED）**
  - `controller/AuthController.java`
    - `Long.parseLong(authentication.getName())` 包 `try/catch NumberFormatException`
    - 失敗時拋 `InvalidTokenException` → HTTP 401（原本會直接 500）
- **#5 `PlayerService.updateProfile()` 無 `@Transactional`（MED）**
  - `service/PlayerService.java`
    - `updateProfile()` 加 `@Transactional`：中途失敗自動回滾
    - `getProfile()` 加 `@Transactional(readOnly = true)`：避免不必要的 dirty checking
- **#11 `Member.passwordHash` 序列化洩漏防禦（MED，原報告 HIGH）**
  - `entity/Member.java`
    - 加 `@JsonIgnore`：Jackson 永不序列化此欄位（雙層防禦，即便 Member entity 不小心被當 response 也安全）
    - 加 `@ToString(exclude = "passwordHash")`：Lombok toString 排除
    - 加 `import com.fasterxml.jackson.annotation.JsonIgnore` 與 `lombok.ToString`

### Fixed (gateway-service)
- **#14 auth 端點無速率限制 → 暴力破解風險（HIGH）**
  - 新增 `config/RateLimitConfig.java`
    - `KeyResolver ipKeyResolver` Bean：優先取 `X-Forwarded-For` 首段 IP，否則 socket remote address
  - `resources/application.yml`
    - `member-auth` 路由加 `RequestRateLimiter` filter
    - 預設 5 req/sec replenish、burst 10；可由 `AUTH_RATE_LIMIT_REPLENISH` / `AUTH_RATE_LIMIT_BURST` 環境變數調整
    - 使用 Spring Cloud Gateway 內建 `RedisRateLimiter`（無需新依賴）
- **#18 CORS `allowedHeaders: "*"` + `allowCredentials: true` 違反規範（MED）**
  - `resources/application.yml`
    - `allowedHeaders` 改為白名單：`[Authorization, Content-Type, X-Requested-With]`
- **#21 Gateway 缺乏 filter order 文件化（MED）**
  - 新增 `filter/FilterOrder.java`：集中定義所有 GlobalFilter 的 order 常數
    - `RATE_LIMIT = -200`、`JWT_AUTHENTICATION = -100`
  - `filter/JwtAuthenticationGlobalFilter.java`
    - `getOrder()` 改用 `FilterOrder.JWT_AUTHENTICATION` 常數
- **#24 Gateway Redis 黑名單查詢 fail-closed（MED）**
  - `filter/JwtAuthenticationGlobalFilter.java`
    - `redis.hasKey()` 加上 `.onErrorResume(...)`：Redis 故障時視為「token 已撤銷」拒絕請求（fail-closed）
    - 防止 Redis 暫時不可用時，已被撤銷的 token 因黑名單查不到而復活

### Configuration Notes
新增可選環境變數（gateway-service）：
- `AUTH_RATE_LIMIT_REPLENISH`（預設 `5`）：每秒補充的 token 數
- `AUTH_RATE_LIMIT_BURST`（預設 `10`）：burst 允許的最大 token 數

### Verification
- 所有檔案語法正確（Java 21 + Spring Boot 3.3.5）
- gateway pom.xml 已含 `spring-boot-starter-data-redis-reactive`，`RedisRateLimiter` 由 `spring-cloud-starter-gateway` 提供，無新增依賴

---

## [Security Audit P0] — 2026-05-28 — 三項 P0 安全漏洞修復

### Context
依據 `AUDIT_REPORT.md` 驗證後實際存在的 P0 漏洞修復。
報告中其他 P0 候選項目（#9 /internal/** filter 順序、#25/#26/#35/#38 wallet/kafka）經驗證後不成立或無對應程式碼，未列入。

### Fixed
- **#19 JWT role claim 遺漏 → Gateway RBAC 失效（HIGH）**
  - `security/JwtTokenProvider.java`
    - `buildToken()` 加入 `.claim("role", role)`
    - `generateAccessToken(memberId, username)` → `generateAccessToken(memberId, username, role)` **（簽名變更）**
    - `generateRefreshToken(memberId, username)` → `generateRefreshToken(memberId, username, role)` **（簽名變更）**
  - `service/AuthService.java`
    - `login()` 改傳 `member.getRole()` 給 token 生成
    - `refreshToken()` 重新查 DB 取最新 role（避免使用者降權後仍持有高權限 token）
    - 順手補 `Long.parseLong(claims.getSubject())` 的 `NumberFormatException` 捕捉（部分解決 #4）
  - 影響：Gateway `JwtAuthenticationGlobalFilter` 的 `claims.get("role")` 不再永遠為 null，下游 `X-User-Role` header 才能真正用於 RBAC

- **#13 AvatarUrl SVG XSS（HIGH）**
  - `validation/AvatarUrlValidator.java`
    - 將 `startsWith("data:image/")` 寬鬆比對改為 MIME 白名單：`jpeg` / `png` / `gif` / `webp`
    - 明確拒絕 `data:image/svg+xml`（可內嵌 `<script>` 造成 XSS）與其他 `data:` scheme（如 `data:text/html`）

### Cross-service Changes
- **#17 gateway-service CORS localhost fallback（HIGH）**
  - `backend/gateway-service/src/main/resources/application.yml`
    - `${CORS_ALLOWED_ORIGINS:http://localhost:5173}` → `${CORS_ALLOWED_ORIGINS:?...}` 強制必填
  - **部署影響**：Gateway 啟動現在強制要求 `CORS_ALLOWED_ORIGINS` 環境變數，缺失將 fail-fast

### Breaking Changes
- `JwtTokenProvider.generateAccessToken` / `generateRefreshToken` 增加第三個參數 `String role`
- 舊版 access token（無 role claim）仍可通過簽章驗證，但 `X-User-Role` header 會是空字串；建議部署後讓所有使用者重新登入

### Audit Misjudgments Identified
驗證審計報告時發現以下項目**不成立**（已記錄於 AUDIT_REPORT.md）：
- #9 `/internal/**` permitAll：`SecurityConfig` 已用 `addFilterBefore` 正確設定 filter 順序
- #10 InternalSecretFilter timing attack：已使用 `MessageDigest.isEqual()`
- #12 Mass Assignment：`UpdateProfileRequest` 僅含 nickname/avatar，無敏感欄位
- #15 JWT secret 長度未驗證：JJWT 0.12.6 `Keys.hmacShaKeyFor()` 已內建 `WeakKeyException`

### Known Pre-existing Issues (Not in scope)
- `test/AuthServiceLoginTest.java` 與 `test/RefreshTokenServiceTest.java` 引用了不存在的 method（`setActive`、`getRefreshTokenExpiryMs`、`getMemberIdFromToken`）— 在本次修改前已編譯失敗，需另開 task 修

---

## [T-014 rebuild] — 2026-05-27 — Player Profile GET & PUT API（全量重建）

### Context
所有 T-010 ~ T-015 的 source 檔案遺失（僅 `SecurityConfig.java` 存在），
本次在 `target/classes` .class 檔確認原有結構後，從零重建所有必要類別，
並完整實作 T-014 規格。

### Added (T-014 核心，新增)
- `dto/ProfileResponse.java` — `playerId, username, nickname, avatar, role, createdAt`（ISO-8601）
- `dto/UpdateProfileRequest.java` — `@Size(min=2,max=50)` nickname；`@ValidAvatarUrl` avatar；兩欄位均可 null
- `validation/ValidAvatarUrl.java` — 自訂 `@Constraint` 注解（Jakarta EE 10）
- `validation/AvatarUrlValidator.java` — 允許 null / `https?://...` / `data:image/...;base64,...`
- `service/PlayerService.java` — `getProfile(Long)` / `updateProfile(Long, UpdateProfileRequest)`
- `controller/PlayerController.java` — `GET /api/v1/player/profile`（200）；`PUT /api/v1/player/profile`（200）
- `exception/NoUpdateFieldException.java` — extends RuntimeException → HTTP 400

### Added (前置類別重建)
- `pom.xml` — Spring Boot 3.3.5, Java 21, JJWT 0.12.6, Lombok, MySQL, Redis, Kafka
- `src/main/resources/application.yml` — 還原自 target/classes/application.yml
- `MemberServiceApplication.java`
- `entity/Member.java` — `@Entity @Table("members")`；對齊 init.sql schema（id/username/email/passwordHash/nickname/avatar/role/status/createdAt/updatedAt）
- `repository/MemberRepository.java` — `existsByUsername`, `existsByEmail`, `findByUsername`
- `dto/ApiResponse.java` — `ok(T)` / `success(T, String)` / `error(String)` 工廠方法
- `dto/RegisterRequest.java` / `RegisterResponse.java`
- `dto/LoginRequest.java` / `LoginResponse.java`
- `dto/RefreshRequest.java` / `RefreshResponse.java`
- `exception/GlobalExceptionHandler.java` — 完整處理：409/404/401/403/400(validation)/400(NoUpdateField)/500
- `exception/MemberNotFoundException.java` / `MemberAlreadyExistsException.java`
- `exception/InvalidCredentialsException.java` / `AccountDisabledException.java` / `InvalidTokenException.java`
- `security/JwtTokenProvider.java` — JJWT 0.12.6 簽發 / 驗證 / 解析
- `security/JwtAuthenticationFilter.java` — OncePerRequestFilter；principal = `String.valueOf(memberId)`
- `security/InternalSecretFilter.java` — `@Component`；`MessageDigest.isEqual()` 常數時間比較
- `config/JwtFilterConfig.java` — 宣告 `JwtAuthenticationFilter` @Bean 並停用 Servlet 自動註冊
- `service/TokenRedisService.java` — refresh token 存取 + JTI 黑名單
- `service/AuthService.java` — register / login / logout / refreshToken
- `controller/AuthController.java` — `/api/v1/auth/{register,login,logout,refresh}`

### Tests Added
- `service/PlayerServiceTest.java` — 7 個測試案例（全部通過）
  - `getProfile_success`, `getProfile_memberNotFound`
  - `updateProfile_nicknameOnly_success`, `updateProfile_avatarUrl_success`, `updateProfile_avatarBase64_success`
  - `updateProfile_noFields_throwsException`, `updateProfile_memberNotFound`
- `validation/AvatarUrlValidatorTest.java` — 5 個測試案例（全部通過）
  - `nullValue_isValid`, `validHttpUrl_isValid`, `validBase64DataUri_isValid`
  - `invalidString_isInvalid`, `ftpUrl_isInvalid`

### Test Results
```
Tests run: 12, Failures: 0, Errors: 0, Skipped: 0 — BUILD SUCCESS
```

### Security Notes
- playerId 只從 JWT SecurityContext（`authentication.getName()`）取得，不接受 request params
- `mapToResponse()` 明確排除 passwordHash
- avatar 欄位不寫入任何 log（可能含大型 Base64 字串）
- `@ValidAvatarUrl` 允許 null（field optional）；`not-a-url` / `ftp://` 均拒絕

---

## [T-015] — 2026-05-27 — SecurityConfig 從零重建

### Added
- `config/SecurityConfig.java` — `@Configuration @EnableWebSecurity @RequiredArgsConstructor`；完整 SecurityFilterChain、PasswordEncoder、AuthenticationManager 三個 Bean

### SecurityFilterChain 規則
| 路徑 | JWT 驗證 | InternalSecretFilter |
|---|---|---|
| `/api/v1/auth/**` | ❌ permitAll | ❌ 不攔截 |
| `/internal/**` | ❌ permitAll | ✅ 驗 X-Internal-Secret |
| `/actuator/health`, `/actuator/info` | ❌ permitAll | ❌ 不攔截 |
| 其他所有路徑 | ✅ authenticated | ❌ 不攔截 |

### Filter 執行順序
```
InternalSecretFilter → JwtAuthenticationFilter → UsernamePasswordAuthenticationFilter
```

### Verified (既有 filter，未修改)
- `security/InternalSecretFilter.java`
  - 非 `/internal/**` 路徑直接放行 ✅
  - 讀取 `X-Internal-Secret` header ✅
  - 使用 `MessageDigest.isEqual()` 常數時間比較 ✅
  - 驗證失敗回 HTTP 401 JSON，不繼續 filter chain ✅
  - ⚠️ 401 message 實際為 `"Unauthorized internal request"`（規格指定 `"Invalid internal secret"`，既有程式碼未改動）
- `security/JwtAuthenticationFilter.java`
  - 讀取 `Authorization: Bearer <token>` header ✅
  - 呼叫 `JwtTokenProvider.validateToken()`；無效 token 不設 context，繼續 chain ✅
  - 額外執行 `tokenRedisService.isBlacklisted(jti)` 黑名單檢查 ✅
  - 有效 token：`claims.getSubject()` → `String.valueOf(memberId)` 作為 principal，設入 `SecurityContextHolder` ✅

### Security Notes
- CSRF 禁用（stateless REST API，無 cookie session）
- `SessionCreationPolicy.STATELESS`：Spring Security 不建立也不使用 HttpSession
- `/internal/**` 設 `permitAll` 是刻意設計：JWT 不管此路徑，存取控制完全由 `InternalSecretFilter` 負責
- `PasswordEncoder` Bean 供 `AuthService` 在 register 時 hash、login 時比對使用
- `AuthenticationManager` Bean 供 `AuthService.login()` 呼叫 `authenticate()` 使用

---

## [T-014] — 2026-05-27 — Player Profile GET and PUT API

### Added
- `dto/UpdateProfileRequest.java` — `@Size(max=50)` nickname；`@Size(max=500) @ValidAvatarUrl` avatarUrl；兩欄位均為 optional
- `dto/ProfileResponse.java` — 7 個允許欄位（id/username/email/nickname/avatarUrl/createdAt/updatedAt），有意排除 passwordHash
- `validation/ValidAvatarUrl.java` — 自訂 `@Constraint` 注解
- `validation/AvatarUrlValidator.java` — 允許 `https?://` 或 `data:image/(jpeg|png|gif|webp);base64,`；null/blank 視為不更新直接通過
- `service/PlayerService.java` — `getProfile(Long)` / `updateProfile(Long, UpdateProfileRequest)`；透過 `findByIdAndIsActiveTrue` 同時過濾停用帳號
- `controller/PlayerController.java` — `GET /api/v1/player/profile`（200）；`PUT /api/v1/player/profile`（200）；memberId 從 `authentication.getName()` 取得，無額外 DB 查詢
- `exception/MemberNotFoundException.java` — extends RuntimeException，對應 HTTP 404
- `exception/NoUpdateFieldException.java` — extends RuntimeException，對應 HTTP 400

### Modified
- `repository/MemberRepository.java`
  - 新增 `Optional<Member> findByIdAndIsActiveTrue(Long id)`
- `exception/GlobalExceptionHandler.java`
  - 新增 `handleMemberNotFound`：HTTP 404
  - 新增 `handleNoUpdateField`：HTTP 400

### Tests Added
- `service/PlayerServiceTest.java` — 7 個測試案例
  - `getProfile_success`、`getProfile_memberNotFound`
  - `updateProfile_nicknameOnly`、`updateProfile_avatarUrlOnly`、`updateProfile_bothFields`
  - `updateProfile_noFieldsProvided`、`updateProfile_memberNotFound`
  - 含反射驗證 `ProfileResponse` 無 `getPasswordHash()` 方法
- `validation/AvatarUrlValidatorTest.java` — 6 個純 JUnit 測試（https/http/data-URI/無效/null/blank）

### Security Notes
- memberId 只從 JWT SecurityContext（`authentication.getName()`）取得，不接受 request body 或 path variable 傳入
- `mapToResponse()` 只映射 7 個明確允許的欄位，passwordHash 有意排除在外
- avatarUrl `@Size(max=500)` 先攔截過長字串，再由 `@ValidAvatarUrl` 檢查格式，符合 DB VARCHAR(500) 限制

---

## [T-013] — 2026-05-27 — Finalize SecurityFilterChain

### Added
- `security/InternalSecretFilter.java` — `@Component`；`MessageDigest.isEqual()` 常數時間比較防 timing attack；非 `/internal/**` 直接放行；驗證失敗寫 401 JSON 後直接 return，不洩漏請求

### Modified
- `config/SecurityConfig.java`
  - 注入 `InternalSecretFilter`
  - 路由規則重構：`/api/v1/auth/**` + `/internal/**` + `/actuator/health` → `permitAll`；其他 → `authenticated()`
  - filter 執行順序：`InternalSecretFilter` → `JwtAuthenticationFilter` → `UsernamePasswordAuthenticationFilter`
- `application.yml`
  - 新增 `internal.secret: ${INTERNAL_SECRET:?...}`（`:?` 語法：缺少環境變數時服務拒絕啟動）

### Tests Added
- `security/InternalSecretFilterTest.java` — 4 個測試
  - `nonInternalPath_passesThrough`、`internalPath_validSecret_passesThrough`
  - `internalPath_wrongSecret_returns401`、`internalPath_missingHeader_returns401`
  - 以 `filterChain.getRequest() != null` 驗證 doFilter 是否被呼叫

### Security Notes
- `MessageDigest.isEqual()` 替代 `String.equals()`：防止 timing attack 推測 secret 長度
- `/internal/**` 設 `permitAll` 是刻意設計：Spring Security 不需 JWT，存取控制由 InternalSecretFilter 全權負責
- 401 response 後絕不呼叫 `filterChain.doFilter`，避免請求繼續往下洩漏

---

## [T-011 fix] — 2026-05-27 — JWT Filter Principal 修正

### Modified
- `security/JwtAuthenticationFilter.java`
  - principal 從 `username` 改為 `String.valueOf(memberId)`
  - 移除 `auth.setDetails(memberId)` 模式
  - 讓下游 controller 可直接 `Long.parseLong(authentication.getName())` 取得 memberId，不需 DB 查詢
- `controller/AuthController.java`
  - logout 取 memberId 改為 `Long.parseLong(authentication.getName())`
  - 移除未使用的 `Authentication` import

---

## [T-012] — 2026-05-27 — JWT Refresh Token Rotation

### Added
- `dto/RefreshRequest.java` — `@NotBlank refreshToken` 欄位
- `dto/RefreshResponse.java` — `accessToken`, `refreshToken`, `tokenType = "Bearer"`, `expiresIn = 900`
- `exception/InvalidTokenException.java` — extends RuntimeException，對應 HTTP 401

### Modified
- `service/AuthService.java`
  - 新增 `refreshToken(RefreshRequest)` 方法（9 步驟）
  - 驗證 JWT → 查 Redis → 比對 token → 先刪後存（輪換原子性）→ 發新 token
  - 新增 import：`RefreshRequest`, `RefreshResponse`, `InvalidTokenException`
- `controller/AuthController.java`
  - 新增 `POST /api/v1/auth/refresh` endpoint（不需要 Authorization header）
- `config/SecurityConfig.java`
  - 將 `/api/v1/auth/refresh` 加入 `permitAll` 清單
- `exception/GlobalExceptionHandler.java`
  - 新增 `handleInvalidToken`：HTTP 401，固定回傳 `"Refresh token is invalid or expired"`（不透傳內部訊息）

### Tests Added
- `service/RefreshTokenServiceTest.java` — 5 個測試案例
  - `refreshToken_success` — 正常換發，含 InOrder 驗證 delete → save 順序
  - `refreshToken_invalidJwt` — JWT 驗證失敗 → InvalidTokenException
  - `refreshToken_revokedToken` — Redis 查無 token → InvalidTokenException
  - `refreshToken_tokenMismatch` — 存儲值不符（可能重放攻擊）→ InvalidTokenException
  - `refreshToken_verifyRotationOrder` — 專門驗證 deleteRefreshToken 先於 saveRefreshToken

### Security Notes
- Token 比對使用 `String.equals()`，從不使用 `==`
- Refresh Token 字串值在任何層級都不記錄於 log
- `delete` 先於 `save`：若進程在兩步之間崩潰，使用者需重新登入，但不會同時存在兩個有效 token

---

## [T-011] — 2026-05-27 — JWT Login and Logout API

### Added
- `security/JwtTokenProvider.java` — JJWT 0.12.6 token 簽發 / 驗證 / 解析，`@Value` 注入三組 JWT 設定
- `security/JwtAuthenticationFilter.java` — `extends OncePerRequestFilter`；無 `@Component`（由 SecurityConfig 建立 Bean 避免 Servlet 雙重註冊）；memberId 存入 `auth.setDetails()`
- `service/TokenRedisService.java` — `StringRedisTemplate` 操作；`refresh:{memberId}` / `blacklist:{jti}` key 格式；5 個方法
- `dto/LoginRequest.java` — `@NotBlank username`, `@NotBlank password`
- `dto/LoginResponse.java` — `accessToken`, `refreshToken`, `tokenType = "Bearer"`, `expiresIn = 900`
- `exception/InvalidCredentialsException.java` — extends RuntimeException，對應 HTTP 401
- `exception/AccountDisabledException.java` — extends RuntimeException，對應 HTTP 403

### Modified
- `service/AuthService.java`
  - 建構子新增 `JwtTokenProvider`, `TokenRedisService` 參數
  - 新增 `login(LoginRequest)` 方法：查帳號 → 驗密碼 → 檢查 isActive → 發 token → 存 Redis
  - 新增 `logout(String authorizationHeader, Long memberId)` 方法：加黑名單 → 刪 Redis
- `controller/AuthController.java`
  - 新增 `POST /api/v1/auth/login` endpoint（200 OK）
  - 新增 `POST /api/v1/auth/logout` endpoint（200 OK，需 Authorization header）
- `config/SecurityConfig.java`
  - 注入 `JwtTokenProvider`, `TokenRedisService`
  - `JwtAuthenticationFilter` 宣告為 `@Bean`
  - 加入 `SessionCreationPolicy.STATELESS`
  - `/logout` 設為 `authenticated()`
- `exception/GlobalExceptionHandler.java`
  - 新增 `handleInvalidCredentials`：HTTP 401
  - 新增 `handleAccountDisabled`：HTTP 403
- `repository/MemberRepository.java`
  - 新增 `Optional<Member> findByUsername(String username)`（login 流程必需）
- `dto/ApiResponse.java`
  - 新增 `success(T data, String message)` 工廠方法

### Tests Added
- `service/AuthServiceLoginTest.java` — 5 個測試案例
  - `login_success`, `login_usernameNotFound`, `login_wrongPassword`, `login_accountDisabled`, `logout_success`

### Security Notes
- 帳號不存在與密碼錯誤回傳**相同訊息** `"Invalid username or password"`，防止帳號枚舉攻擊
- 原始密碼在任何 log 層級都不記錄
- Access Token 不存 Redis，只在登出時將 jti 加入黑名單，黑名單 TTL = token 剩餘存活時間

---

## [T-010] — 2026-05-27 — Member Registration API

### Added
- `entity/Member.java` — `@Entity @Table("members")`；`@PrePersist` / `@PreUpdate` 自動設時間戳；JPA field access
- `repository/MemberRepository.java` — `existsByUsername`, `existsByEmail`（Spring Data 衍生查詢）
- `dto/RegisterRequest.java` — `@NotBlank @Size` username；`@NotBlank @Email` email；`@Pattern` 密碼（需含字母+數字且 ≥8 碼）
- `dto/RegisterResponse.java` — `id`, `username`, `email`, `createdAt`
- `dto/ApiResponse.java` — 泛型包裝器；`ok(data)` / `error(message)` 工廠方法
- `service/AuthService.java` — 建構子注入 6 個依賴；`register()` 方法（重複檢查 → hash → 存 DB → 送 Kafka 事件）
- `controller/AuthController.java` — `@RequestMapping("/api/v1/auth")`；`POST /register`（HTTP 201）
- `exception/MemberAlreadyExistsException.java` — extends RuntimeException，對應 HTTP 409
- `exception/GlobalExceptionHandler.java` — `@RestControllerAdvice`；三層捕捉（409 / 400 / 500）
- `config/SecurityConfig.java` — CSRF 關閉；全部 `permitAll`（JWT filter 待 T-011）；`BCryptPasswordEncoder` Bean

### Tests Added
- `service/AuthServiceTest.java` — 4 個測試案例
  - `register_success`, `register_duplicateUsername`, `register_duplicateEmail`, `register_kafkaFailure_doesNotRollback`

### Security Notes
- 密碼只以 BCrypt hash 儲存，原始明文在任何層級都不記錄
- Kafka 送出失敗以 `log.warn` 吞掉，不影響 HTTP 回應，不觸發 transaction rollback

---

## Unchanged Files (across all tasks)
- `MemberServiceApplication.java` — Spring Boot 啟動入口，未修改

---

## [chore] — 2026-05-26 — 接入 monorepo parent pom

Commit: `7aeaddc` — Wang Pitt

### Modified
- `pom.xml` — 移除 `spring-boot-starter-parent` 直接繼承，改為繼承 monorepo `lucky-star-casino` parent BOM；版本號、依賴管理統一由 root pom 控制

---

## [chore] — 2026-05-26 — Config 外部化為環境變數

Commit: `18ae617` — We1Yu

### Modified
- `src/main/resources/application.yml`
  - `JWT_SECRET`、`INTERNAL_SERVICE_SECRET` 改為必填環境變數（`:?` 語法，缺少則拒絕啟動）
  - DB 密碼 / Host / Port、Redis、Kafka bootstrap 全部改為 `${VAR:default}` 形式
  - `spring.jpa.hibernate.ddl-auto` 從寫死 `update` 改為 `${JPA_DDL_AUTO:validate}`（schema 由 Flyway init.sql 管理）
  - `logging.level` 從寫死 `DEBUG` 改為 `${LOG_LEVEL_*:INFO}`

---

## [init] — 2026-05-26 — 服務初始化

Commit: `90b2774` — ALexChang1999

### Added
- `pom.xml` — Spring Boot 3.3.5 + Java 21，MySQL / Redis / Kafka 依賴
- `MemberServiceApplication.java` — `@SpringBootApplication` 入口
- `src/main/resources/application.yml` — DB / Redis / Kafka 連線設定，port `8081`
- `mvnw` / `mvnw.cmd` — Maven Wrapper 3.9.6
- `MemberServiceApplicationTests.java` — context load smoke test
