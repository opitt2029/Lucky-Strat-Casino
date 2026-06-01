-- ============================================================
-- Flyway Migration V4：PostgreSQL 新增 DIAMOND_EXCHANGE 子類型（T-103）
-- 幸運星幣城 — 鑽石兌換星幣功能，擴充 wallet_transactions.sub_type 允許值
-- ============================================================

-- 移除舊 CHECK 約束，重建包含 DIAMOND_EXCHANGE 的新版本
-- PostgreSQL 不支援 ALTER CONSTRAINT 變更規則，需 DROP + ADD
ALTER TABLE wallet_transactions
    DROP CONSTRAINT IF EXISTS chk_wt_sub_type;

ALTER TABLE wallet_transactions
    ADD CONSTRAINT chk_wt_sub_type
        CHECK (sub_type IN ('BET', 'WIN', 'CHECKIN', 'TASK', 'GIFT', 'GM_REWARD', 'BANKRUPTCY_AID', 'DIAMOND_EXCHANGE'));
