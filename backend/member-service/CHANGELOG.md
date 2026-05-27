# Changelog — member-service

All notable changes to member-service are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
