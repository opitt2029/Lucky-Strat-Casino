package com.luckystar.wallet.dto;

import lombok.Builder;
import lombok.Data;

/**
 * 派彩 / 入帳回應（T-023）。與 {@link DebitResponse} 對稱，額外回傳 {@code frozenAfter}
 * 讓呼叫方確認解凍結果。
 *
 * @see CreditRequest
 */
@Data
@Builder
public class CreditResponse {

    /** 本次入帳產生的流水紀錄 ID。 */
    private Long transactionId;

    private Long playerId;

    /** 本次入帳金額。 */
    private Long amount;

    /** 入帳前餘額。 */
    private Long balanceBefore;

    /** 入帳後餘額。 */
    private Long balanceAfter;

    /** 入帳後的凍結金額（若有解凍，會反映在這裡）。 */
    private Long frozenAfter;

    /**
     * 是否為冪等命中：true 代表這個 idempotencyKey 先前已入帳過，
     * 本次「沒有」重複加錢，回傳的是當初那筆的結果。
     */
    private boolean idempotent;
}
