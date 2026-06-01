package com.luckystar.wallet.dto;

import lombok.Builder;
import lombok.Data;

/**
 * 鑽石兌換星幣回應（T-103）。
 *
 * @see DiamondExchangeRequest
 */
@Data
@Builder
public class DiamondExchangeResponse {

    private Long playerId;

    /** 本次消耗的鑽石數量。 */
    private Long diamondAmount;

    /** 本次獲得的星幣數量（= diamondAmount × 20）。 */
    private Long starAmount;

    /** 兌換後的鑽石餘額。 */
    private Long diamondBalanceAfter;

    /** 兌換後的星幣餘額。 */
    private Long starBalanceAfter;

    /** 對應的星幣入帳流水 ID（wallet_transactions.id）。 */
    private Long transactionId;

    /** 是否為冪等命中（true 表示此次兌換已在先前完成，未重複執行）。 */
    private boolean idempotent;
}
