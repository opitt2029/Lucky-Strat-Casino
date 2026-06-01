package com.luckystar.wallet.kafka;

/**
 * 入帳完成事件，發布到 Kafka topic {@code wallet.credit}。
 *
 * <p>與 {@link WalletDebitEvent} 對稱，多帶一個 {@code subType}（入帳來源：WIN/CHECKIN/...）。
 *
 * <p>架構（ADR-002，已拍板）：wallet.credit 是「**已入帳事件**」，由 wallet-service 在入帳後發布，
 * 供 rank-service 等下游消費更新排行榜，語意與 debit→wallet.debit 對稱。
 * 「**請入帳指令**」走另一個 topic {@code wallet.credit.request}（見 {@link WalletCreditRequestEvent}）。
 *
 * <p>⚠️ **請勿在 wallet-service 內消費 wallet.credit**，否則會與本事件形成「自己發、自己收、再入帳」
 * 的無限迴圈。要觸發入帳請發 {@code wallet.credit.request} 指令。
 */
public record WalletCreditEvent(
        Long transactionId,
        Long playerId,
        Long amount,
        Long balanceBefore,
        Long balanceAfter,
        String subType,
        String idempotencyKey,
        String referenceId
) {}
