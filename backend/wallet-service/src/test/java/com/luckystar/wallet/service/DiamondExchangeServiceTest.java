package com.luckystar.wallet.service;

import com.luckystar.wallet.dto.CreditResponse;
import com.luckystar.wallet.dto.DiamondExchangeRequest;
import com.luckystar.wallet.dto.DiamondExchangeResponse;
import com.luckystar.wallet.exception.DiamondWalletNotFoundException;
import com.luckystar.wallet.exception.InsufficientDiamondException;
import com.luckystar.wallet.postgres.entity.DiamondWallet;
import com.luckystar.wallet.postgres.entity.WalletTransaction;
import com.luckystar.wallet.postgres.repository.DiamondWalletRepository;
import com.luckystar.wallet.postgres.repository.WalletTransactionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DiamondExchangeServiceTest {

    @Mock DiamondWalletService diamondWalletService;
    @Mock DiamondWalletRepository diamondWalletRepository;
    @Mock WalletService walletService;
    @Mock WalletTransactionRepository walletTransactionRepository;

    @InjectMocks DiamondExchangeService diamondExchangeService;

    private DiamondExchangeRequest buildRequest(long diamondAmount, String key) {
        DiamondExchangeRequest req = new DiamondExchangeRequest();
        req.setDiamondAmount(diamondAmount);
        req.setIdempotencyKey(key);
        return req;
    }

    @Test
    void exchange_success_debitsDiamondAndCreditsStars() {
        DiamondExchangeRequest req = buildRequest(10L, "key-1");
        String creditKey = "diamond-exchange:key-1";

        when(walletTransactionRepository.findByIdempotencyKey(creditKey)).thenReturn(Optional.empty());
        when(diamondWalletService.debitDiamond(42L, 10L)).thenReturn(90L);
        CreditResponse creditResp = CreditResponse.builder()
                .transactionId(99L).playerId(42L).amount(200L)
                .balanceBefore(1000L).balanceAfter(1200L).idempotent(false).build();
        when(walletService.credit(any())).thenReturn(creditResp);

        DiamondExchangeResponse resp = diamondExchangeService.exchange(42L, req);

        assertThat(resp.getPlayerId()).isEqualTo(42L);
        assertThat(resp.getDiamondAmount()).isEqualTo(10L);
        assertThat(resp.getStarAmount()).isEqualTo(200L);   // 10 × 20
        assertThat(resp.getDiamondBalanceAfter()).isEqualTo(90L);
        assertThat(resp.getStarBalanceAfter()).isEqualTo(1200L);
        assertThat(resp.getTransactionId()).isEqualTo(99L);
        assertThat(resp.isIdempotent()).isFalse();
    }

    @Test
    void exchange_correctExchangeRate_starAmountIs20xDiamond() {
        DiamondExchangeRequest req = buildRequest(5L, "key-rate");
        when(walletTransactionRepository.findByIdempotencyKey(any())).thenReturn(Optional.empty());
        when(diamondWalletService.debitDiamond(eq(1L), eq(5L))).thenReturn(95L);
        CreditResponse creditResp = CreditResponse.builder()
                .transactionId(1L).playerId(1L).amount(100L)
                .balanceBefore(0L).balanceAfter(100L).idempotent(false).build();
        when(walletService.credit(any())).thenReturn(creditResp);

        DiamondExchangeResponse resp = diamondExchangeService.exchange(1L, req);

        // 驗證 credit 呼叫時 amount 為 5 × 20 = 100
        ArgumentCaptor<com.luckystar.wallet.dto.CreditRequest> captor =
                ArgumentCaptor.forClass(com.luckystar.wallet.dto.CreditRequest.class);
        verify(walletService).credit(captor.capture());
        assertThat(captor.getValue().getAmount()).isEqualTo(100L);
        assertThat(captor.getValue().getSubType()).isEqualTo("DIAMOND_EXCHANGE");
        assertThat(captor.getValue().getIdempotencyKey()).isEqualTo("diamond-exchange:key-rate");
        assertThat(resp.getStarAmount()).isEqualTo(100L);
    }

    @Test
    void exchange_insufficientDiamond_throwsAndDoesNotCreditStars() {
        DiamondExchangeRequest req = buildRequest(100L, "key-2");
        when(walletTransactionRepository.findByIdempotencyKey(any())).thenReturn(Optional.empty());
        when(diamondWalletService.debitDiamond(42L, 100L))
                .thenThrow(new InsufficientDiamondException("Insufficient diamond balance: required=100 available=50"));

        assertThatThrownBy(() -> diamondExchangeService.exchange(42L, req))
                .isInstanceOf(InsufficientDiamondException.class);

        verify(walletService, never()).credit(any());
    }

    @Test
    void exchange_diamondWalletNotFound_throwsAndDoesNotCreditStars() {
        DiamondExchangeRequest req = buildRequest(10L, "key-3");
        when(walletTransactionRepository.findByIdempotencyKey(any())).thenReturn(Optional.empty());
        when(diamondWalletService.debitDiamond(99L, 10L))
                .thenThrow(new DiamondWalletNotFoundException("Diamond wallet not found for player: 99"));

        assertThatThrownBy(() -> diamondExchangeService.exchange(99L, req))
                .isInstanceOf(DiamondWalletNotFoundException.class);

        verify(walletService, never()).credit(any());
    }

    @Test
    void exchange_idempotentKey_returnsExistingResultWithoutDebitingDiamond() {
        DiamondExchangeRequest req = buildRequest(10L, "dup-key");
        String creditKey = "diamond-exchange:dup-key";

        WalletTransaction existingTx = WalletTransaction.builder()
                .id(55L).playerId(42L).type("CREDIT").subType("DIAMOND_EXCHANGE")
                .amount(200L).balanceBefore(800L).balanceAfter(1000L)
                .idempotencyKey(creditKey).build();
        when(walletTransactionRepository.findByIdempotencyKey(creditKey))
                .thenReturn(Optional.of(existingTx));
        DiamondWallet dw = DiamondWallet.builder().playerId(42L).balance(90L).version(1L).build();
        when(diamondWalletRepository.findById(42L)).thenReturn(Optional.of(dw));

        DiamondExchangeResponse resp = diamondExchangeService.exchange(42L, req);

        assertThat(resp.isIdempotent()).isTrue();
        assertThat(resp.getTransactionId()).isEqualTo(55L);
        assertThat(resp.getStarBalanceAfter()).isEqualTo(1000L);
        assertThat(resp.getDiamondBalanceAfter()).isEqualTo(90L);

        // 冪等命中不應執行扣款或入帳
        verify(diamondWalletService, never()).debitDiamond(anyLong(), anyLong());
        verify(walletService, never()).credit(any());
    }
}
