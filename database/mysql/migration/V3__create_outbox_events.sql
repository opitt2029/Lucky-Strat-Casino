-- ============================================================
-- Flyway Migration V3：Transactional Outbox 事件表
-- 解決「DB 寫入」與「Kafka 發送」的原子性問題
-- 業務資料與待發事件寫在同一交易；背景 OutboxPoller 再非同步投遞
-- ============================================================

-- -------------------------------------------------------
-- outbox_events：待發送 Kafka 事件
-- status=PENDING 由 OutboxPoller 撈出投遞，成功後改為 SENT
-- idx_outbox_status_created 支援「依建立時間順序撈未發送事件」
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS outbox_events (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    topic       VARCHAR(100) NOT NULL,                     -- 目標 Kafka topic
    kafka_key   VARCHAR(100),                              -- Kafka message key（可為 NULL）
    payload     TEXT         NOT NULL,                     -- JSON 事件內容
    status      VARCHAR(20)  NOT NULL DEFAULT 'PENDING',   -- PENDING / SENT
    retry_count INT          NOT NULL DEFAULT 0,           -- 投遞失敗累加，供觀測/告警
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at     TIMESTAMP    NULL,                         -- 成功投遞時間
    CONSTRAINT pk_outbox_events  PRIMARY KEY (id),
    CONSTRAINT chk_outbox_status CHECK (status IN ('PENDING', 'SENT'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_outbox_status_created ON outbox_events (status, created_at);
