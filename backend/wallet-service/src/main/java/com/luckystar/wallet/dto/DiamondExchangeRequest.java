package com.luckystar.wallet.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 鑽石兌換星幣請求（T-103）。對應 {@code POST /api/v1/wallet/diamond/exchange}。
 *
 * <p>兌換者（playerId）由 gateway 注入的 {@code X-User-Id} header 決定；
 * body 帶兌換鑽石數量與冪等鍵。
 */
@Data
public class DiamondExchangeRequest {

    /** 要兌換的鑽石數量，必須為正數。 */
    @NotNull
    @Positive
    private Long diamondAmount;

    /**
     * 冪等鍵：同一個 key 只會真正兌換一次。
     * 呼叫方需保證每次獨立兌換行為使用不同 key，重試同一兌換用同一 key。
     */
    @NotBlank
    @Size(max = 100)
    private String idempotencyKey;
}
