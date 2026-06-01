INSERT INTO task_definitions (task_code, task_name, task_type, reward_amount, target_count, is_active) VALUES
('FIRST_LOGIN',      '首次登入獎勵',   'FIRST_LOGIN',    100,   1,  TRUE),
('DAILY_CHECKIN_1',  '連續簽到第1天',  'DAILY_CHECKIN',   50,   1,  TRUE),
('DAILY_CHECKIN_7',  '連續簽到第7天',  'DAILY_CHECKIN',  200,   7,  TRUE),
('DAILY_CHECKIN_30', '連續簽到第30天', 'DAILY_CHECKIN', 1000,  30,  TRUE),
('BET_COUNT_10',     '累計下注10次',   'BET_COUNT',      100,  10,  TRUE),
('BET_COUNT_100',    '累計下注100次',  'BET_COUNT',      500, 100,  TRUE),
('INVITE_FRIEND_1',  '邀請第1位好友',  'INVITE_FRIEND',  200,   1,  TRUE),
('INVITE_FRIEND_5',  '邀請5位好友',    'INVITE_FRIEND', 1000,   5,  TRUE)
ON DUPLICATE KEY UPDATE
    task_name     = VALUES(task_name),
    task_type     = VALUES(task_type),
    reward_amount = VALUES(reward_amount),
    target_count  = VALUES(target_count),
    is_active     = VALUES(is_active);
