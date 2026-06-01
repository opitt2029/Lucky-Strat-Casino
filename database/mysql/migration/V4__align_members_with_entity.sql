-- ============================================================
-- Flyway Migration V4：members 表對齊 Member entity
-- 修正 V1 schema 與 JPA entity 的落差，避免 ddl-auto=validate 啟動失敗
--   1. 新增 role 欄位（V1 完全缺漏；RBAC / JWT role claim 必需）
--   2. 以 status(VARCHAR) 取代 is_active(BOOLEAN)，保留原啟用狀態語意
--   3. avatar_url(VARCHAR 500) 改名並放寬為 avatar(TEXT)
--   4. nickname 對齊 entity 的 NOT NULL（register 強制帶 nickname）
-- 註：不修改已套用的 V1，改以新 migration ALTER（Flyway checksum 規範）
-- ============================================================

-- 1. 新增 role（預設 PLAYER，與 entity 預設值一致）
ALTER TABLE members
    ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'PLAYER' AFTER nickname;

-- 2. 新增 status，並把舊 is_active 布林轉成字串後移除舊欄位
ALTER TABLE members
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' AFTER role;

UPDATE members
    SET status = CASE WHEN is_active THEN 'ACTIVE' ELSE 'DISABLED' END;

ALTER TABLE members
    DROP COLUMN is_active;

-- 3. avatar_url(VARCHAR 500) → avatar(TEXT)
ALTER TABLE members
    CHANGE COLUMN avatar_url avatar TEXT;

-- 4. nickname 對齊 entity 的 NOT NULL
ALTER TABLE members
    MODIFY COLUMN nickname VARCHAR(50) NOT NULL;
