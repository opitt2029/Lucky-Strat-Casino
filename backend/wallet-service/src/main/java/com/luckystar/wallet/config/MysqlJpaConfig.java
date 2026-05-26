package com.luckystar.wallet.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * MySQL 讀端 JPA Repository 掃描。
 * EntityManagerFactory / TransactionManager 定義在 {@link DataSourceConfig}。
 */
@Configuration
@EnableJpaRepositories(
        basePackages = "com.luckystar.wallet.mysql.repository",
        entityManagerFactoryRef = "mysqlEntityManagerFactory",
        transactionManagerRef = "mysqlTransactionManager"
)
public class MysqlJpaConfig {
}
