CREATE DATABASE IF NOT EXISTS lucky_star_casino;

USE lucky_star_casino;

CREATE TABLE IF NOT EXISTS system_health_check (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
