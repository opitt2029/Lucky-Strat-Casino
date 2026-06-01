package com.luckystar.wallet.service;

import com.luckystar.wallet.dto.CreditRequest;
import com.luckystar.wallet.dto.CreditResponse;
import com.luckystar.wallet.dto.DiamondExchangeRequest;
import com.luckystar.wallet.dto.DiamondExchangeResponse;
import com.luckystar.wallet.postgres.entity.DiamondWallet;
import com.luckystar.wallet.postgres.repository.DiamondWalletRepository;
import com.luckystar.wallet.postgres.repository.WalletTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 鑽石兌換星幣協調器（T-103）。對應 {@code POST /api/v1/wallet/diamond/exchange}。
 *
 * <p>兌換比例：1 鑽石 = {@value #EXCHANGE_RATE} 星幣。整個兌換在單一 PostgreSQL 交易內完成：
 * <ol>
 *   <li><b>冪等預檢</b>：以 {@code "diamond-exchange:" + idempotencyKey} 查星幣入帳流水；
 *       已存在則直接回原結果，不重複扣鑽石也不重複入星幣。</li>
 *   <li><b>鑽石扣款</b>（{@link DiamondWalletService#debitDiamond}）：驗證餘額並以樂觀鎖扣除鑽石。
 *       餘額不足 → 422；樂觀鎖衝突 → 409；錢包不存在 → 404。</li>
 *   <li><b>星幣入帳</b>（{@link WalletService#credit}）：直接呼叫 service 而非 HTTP，以 PROPAGATION_REQUIRED
 *       參與同一 PostgreSQL 交易；子類型為 {@code DIAMOND_EXCHANGE}。</li>
 * </ol>
 *
 * <p>兩步驟共用同一 PostgreSQL 交易，因此天然原子：星幣入帳失敗時整筆交易回滾，鑽石扣款也一同撤銷，
 * 無需額外補償邏輯（對比跨資料源的 T-102 需要手動 revert）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DiamondExchangeService {

    static final long EXCHANGE_RATE = 20L;

    private final DiamondWalletService diamondWalletService;
    private final DiamondWalletRepository diamondWalletRepository;
    private final WalletService walletService;
    private final WalletTransactionRepository walletTransactionRepository;

    @Transactional(transactionManager = "postgresTransactionManager")
    public DiamondExchangeResponse exchange(Long playerId, DiamondExchangeRequest request) {
        long diamondAmount = request.getDiamondAmount();
        long starAmount = diamondAmount * EXCHANGE_RATE;
        String creditKey = "diamond-exchange:" + request.getIdempotencyKey();

        // Step 1: 冪等預檢 — 同一 idempotencyKey 已兌換過就回原結果，不重複扣鑽石也不重複入星幣
        var existingTx = walletTransactionRepository.findByIdempotencyKey(creditKey);
        if (existingTx.isPresent()) {
            var tx = existingTx.get();
            long currentDiamondBalance = diamondWalletRepository.findById(playerId)
                    .map(DiamondWallet::getBalance)
                    .orElse(-1L);
            log.info("Diamond exchange idempotent hit: playerId={} idempotencyKey={}",
                    playerId, request.getIdempotencyKey());
            return DiamondExchangeResponse.builder()
                    .playerId(playerId)
                    .diamondAmount(diamondAmount)
                    .starAmount(tx.getAmount())
                    .diamondBalanceAfter(currentDiamondBalance)
                    .starBalanceAfter(tx.getBalanceAfter())
                    .transactionId(tx.getId())
                    .idempotent(true)
                    .build();
        }

        // Step 2: 鑽石扣款（樂觀鎖，餘額不足 → 422，錢包不存在 → 404，衝突 → 409）
        long diamondBalanceAfter = diamondWalletService.debitDiamond(playerId, diamondAmount);

        // Step 3: 星幣入帳（直接呼叫 service，參與同一 PostgreSQL 交易）
        CreditRequest creditReq = new CreditRequest();
        creditReq.setPlayerId(playerId);
        creditReq.setAmount(starAmount);
        creditReq.setSubType("DIAMOND_EXCHANGE");
        creditReq.setIdempotencyKey(creditKey);
        creditReq.setReferenceId(null);
        CreditResponse creditResp = walletService.credit(creditReq);

        log.info("Diamond exchange completed: playerId={} diamonds={} stars={} diamondBalanceAfter={} starBalanceAfter={}",
                playerId, diamondAmount, starAmount, diamondBalanceAfter, creditResp.getBalanceAfter());

        return DiamondExchangeResponse.builder()
                .playerId(playerId)
                .diamondAmount(diamondAmount)
                .starAmount(starAmount)
                .diamondBalanceAfter(diamondBalanceAfter)
                .starBalanceAfter(creditResp.getBalanceAfter())
                .transactionId(creditResp.getTransactionId())
                .idempotent(false)
                .build();
    }
}
