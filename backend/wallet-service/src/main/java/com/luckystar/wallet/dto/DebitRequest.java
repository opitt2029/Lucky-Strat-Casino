package com.luckystar.wallet.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DebitRequest {

    @NotNull
    private Long playerId;

    @NotNull
    @Positive
    private Long amount;

    @NotBlank
    @Size(max = 100)
    private String idempotencyKey;

    @Size(max = 100)
    private String referenceId;
}
