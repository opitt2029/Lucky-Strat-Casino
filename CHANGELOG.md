# Changelog — Lucky Star Casino

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [chore] — 2026-05-27 — 基礎設施測試與 GitHub Actions CI

### Added

- `package.json`
  - 新增專案根目錄的 npm 設定，定義以下測試指令：
    - `npm test` — 執行所有基礎設施測試
    - `npm run test:docker` — 只跑 docker-compose 相關測試
    - `npm run test:database` — 只跑資料庫 SQL 相關測試
    - `npm run test:kafka` — 只跑 Kafka 相關測試
    - `npm run test:env` — 只跑環境變數相關測試

- `.github/workflows/ci.yml`
  - 新增 GitHub Actions CI workflow
  - 觸發條件：push 或 PR 到 `main` / `develop` 分支
  - 執行環境：ubuntu-latest、Node.js 22
  - 自動執行 `tests/infra/` 下的所有測試

- `tests/infra/docker-compose.test.js`
  - 驗證 `docker-compose.yml` 設定完整性
  - 測試項目：7 個服務存在（mysql、postgres、redis、zookeeper、kafka、kafka-init、kafka-ui）
  - 測試項目：healthcheck 設定（mysqladmin ping、pg_isready、redis-cli）
  - 測試項目：網路（lucky-network）與 volume（lucky_mysql80_data、lucky_postgres_data）
  - 測試項目：port 使用環境變數而非寫死數字

- `tests/infra/database.test.js`
  - 驗證 MySQL 與 PostgreSQL 初始化 SQL 檔案
  - MySQL 測試項目：資料庫建立（utf8mb4）、members、friendships、daily_checkins、task_definitions、player_tasks、gift_logs、wallet_transactions（讀庫）
  - PostgreSQL 測試項目：wallets（含樂觀鎖 version 欄位）、wallet_transactions（idempotency_key 冪等設計）、game_rounds（Provably Fair 欄位）、rank_history、rank_daily_snapshots、game_rtp_stats、admin_alerts

- `tests/infra/kafka.test.js`
  - 驗證 `kafka/kafka-init.sh` 設定
  - 測試項目：6 個一般 topics（member.registered、wallet.debit、wallet.credit、game.result、rank.update、notification.push）
  - 測試項目：2 個 DLT topics（wallet.debit.DLT、wallet.credit.DLT）
  - 測試項目：腳本安全性（set -euo pipefail、#!/bin/bash）
  - 測試項目：連線設定（--if-not-exists、--replication-factor、--partitions）

- `tests/infra/env.test.js`
  - 驗證 `.env.example` 環境變數完整性
  - 測試項目：MySQL、PostgreSQL、Redis、Kafka、所有後端服務 port 都存在且為數字
  - 測試項目：所有 port 不互相衝突

### Test Summary

```
ℹ tests 102
ℹ pass  102
ℹ fail  0
```

---

## [chore] — 2026-05-26 — S0-W1 可驗收版本基礎建設統整

### Modified

- `docker-compose.yml`
  - MySQL image 升級至 8.0，volume 更名為 `lucky_mysql80_data`
  - Zookeeper 新增 healthcheck、port 改用環境變數 `${ZOOKEEPER_PORT}`
  - Kafka 新增 `KAFKA_TRANSACTION_STATE_LOG_*` 設定，新增 volume 持久化

- `database/mysql/init.sql`
  - 移除暫用的 `system_health_check` 表
  - 新增完整業務 schema：members、friendships、daily_checkins、task_definitions、player_tasks、gift_logs、wallet_transactions（CQRS 讀端）

- `database/postgres/init.sql`
  - 移除暫用的 `system_health_check` 表
  - 新增完整業務 schema：wallets、wallet_transactions、game_rounds、rank_history、rank_daily_snapshots、game_rtp_stats、admin_alerts（CQRS 寫端）

- `.env.example`
  - 新增 `MYSQL_HOST`、`POSTGRES_HOST`、`REDIS_HOST`、`ZOOKEEPER_PORT`、`KAFKA_BOOTSTRAP_SERVERS`
  - 新增後端 Secrets 設定：`JWT_SECRET`、`JWT_ACCESS_TOKEN_EXPIRY_MS`、`JWT_REFRESH_TOKEN_EXPIRY_MS`、`INTERNAL_SERVICE_SECRET`
  - 新增服務間呼叫 URL：`MEMBER_SERVICE_URL` 等

---

## [feat] — 2026-05-26 — Kafka Dead Letter Topics

### Added

- `kafka/kafka-init.sh`
  - 新增 Dead Letter Topics（DLT）群組，使用獨立迴圈與較少 partition（1 個）
  - `wallet.debit.DLT` — 扣款事件處理失敗後的備援 topic
  - `wallet.credit.DLT` — 加款事件處理失敗後的備援 topic
