package com.luckystar.admin.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * PostgreSQL 寫端 JPA Repository 掃描（admin_alerts）。
 * EntityManagerFactory / TransactionManager 定義在 {@link DataSourceConfig}。
 */
@Configuration
@EnableJpaRepositories(
        basePackages = "com.luckystar.admin.postgres.repository",
        entityManagerFactoryRef = "postgresEntityManagerFactory",
        transactionManagerRef = "postgresTransactionManager"
)
public class PostgresJpaConfig {
}
