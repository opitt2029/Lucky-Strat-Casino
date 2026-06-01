package com.luckystar.wallet.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.luckystar.wallet.dto.DebitRequest;
import com.luckystar.wallet.dto.DebitResponse;
import com.luckystar.wallet.exception.InsufficientBalanceException;
import com.luckystar.wallet.exception.WalletNotFoundException;
import com.luckystar.wallet.postgres.entity.Wallet;
import com.luckystar.wallet.postgres.entity.WalletTransaction;
import com.luckystar.wallet.postgres.repository.WalletRepository;
import com.luckystar.wallet.postgres.repository.WalletTransactionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WalletServiceDebitTest {

    @Mock
    WalletRepository walletRepository;

    @Mock
    WalletTransactionRepository walletTransactionRepository;

    @Mock
    KafkaTemplate<String, String> kafkaTemplate;

    @Mock
    ObjectMapper objectMapper;

    @InjectMocks
    WalletService walletService;

    private Wallet buildWallet(Long playerId, Long balance, Long version) {
        try {
            Wallet w = new Wallet();
            setField(w, "playerId", playerId);
            setField(w, "balance", balance);
            setField(w, "frozenAmount", 0L);
            setField(w, "version", version);
            return w;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private WalletTransaction buildTransaction(Long id, Long playerId, Long amount,
                                               Long balanceBefore, Long balanceAfter,
                                               String idempotencyKey) {
        return WalletTransaction.builder()
                .id(id)
                .playerId(playerId)
                .type("DEBIT")
                .subType("BET")
                .amount(amount)
                .balanceBefore(balanceBefore)
                .balanceAfter(balanceAfter)
                .idempotencyKey(idempotencyKey)
                .build();
    }

    private DebitRequest buildRequest(Long playerId, Long amount, String idempotencyKey) {
        DebitRequest req = new DebitRequest();
        req.setPlayerId(playerId);
        req.setAmount(amount);
        req.setIdempotencyKey(idempotencyKey);
        return req;
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        var field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }

    @Test
    void debit_newIdempotencyKey_sufficientBalance_savesTransactionAndPublishesKafka() throws Exception {
        DebitRequest request = buildRequest(1L, 300L, "key-001");
        Wallet wallet = buildWallet(1L, 1000L, 0L);

        WalletTransaction savedTx = buildTransaction(1L, 1L, 300L, 1000L, 700L, "key-001");

        when(walletTransactionRepository.findByIdempotencyKey("key-001")).thenReturn(Optional.empty());
        when(walletRepository.findById(1L)).thenReturn(Optional.of(wallet));
        when(walletRepository.save(any(Wallet.class))).thenReturn(wallet);
        when(walletTransactionRepository.save(any(WalletTransaction.class))).thenReturn(savedTx);
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        DebitResponse response = walletService.debit(request);

        verify(walletRepository, times(1)).save(any(Wallet.class));
        verify(walletTransactionRepository, times(1)).save(any(WalletTransaction.class));
        verify(kafkaTemplate, times(1)).send(eq("wallet.debit"), eq("1"), anyString());

        assertThat(response.getTransactionId()).isEqualTo(1L);
        assertThat(response.getBalanceBefore()).isEqualTo(1000L);
        assertThat(response.getBalanceAfter()).isEqualTo(700L);
        assertThat(response.isIdempotent()).isFalse();

        ArgumentCaptor<Wallet> walletCaptor = ArgumentCaptor.forClass(Wallet.class);
        verify(walletRepository).save(walletCaptor.capture());
        assertThat(walletCaptor.getValue().getBalance()).isEqualTo(700L);
    }

    @Test
    void debit_duplicateIdempotencyKey_returnsExistingTransactionWithoutWrites() {
        DebitRequest request = buildRequest(1L, 300L, "key-dup");
        WalletTransaction existingTx = buildTransaction(99L, 1L, 300L, 1000L, 700L, "key-dup");

        when(walletTransactionRepository.findByIdempotencyKey("key-dup")).thenReturn(Optional.of(existingTx));

        DebitResponse response = walletService.debit(request);

        verify(walletRepository, never()).findById(any());
        verify(walletRepository, never()).save(any());
        verify(walletTransactionRepository, never()).save(any());
        verify(kafkaTemplate, never()).send(anyString(), anyString(), anyString());

        assertThat(response.getTransactionId()).isEqualTo(99L);
        assertThat(response.getBalanceBefore()).isEqualTo(1000L);
        assertThat(response.getBalanceAfter()).isEqualTo(700L);
        assertThat(response.isIdempotent()).isTrue();
    }

    @Test
    void debit_insufficientBalance_throwsInsufficientBalanceException() {
        DebitRequest request = buildRequest(1L, 500L, "key-002");
        Wallet wallet = buildWallet(1L, 100L, 0L);

        when(walletTransactionRepository.findByIdempotencyKey("key-002")).thenReturn(Optional.empty());
        when(walletRepository.findById(1L)).thenReturn(Optional.of(wallet));

        assertThatThrownBy(() -> walletService.debit(request))
                .isInstanceOf(InsufficientBalanceException.class)
                .hasMessage("Insufficient balance");

        verify(walletRepository, never()).save(any());
        verify(walletTransactionRepository, never()).save(any());
    }

    @Test
    void debit_walletNotFound_throwsWalletNotFoundException() {
        DebitRequest request = buildRequest(99L, 100L, "key-003");

        when(walletTransactionRepository.findByIdempotencyKey("key-003")).thenReturn(Optional.empty());
        when(walletRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> walletService.debit(request))
                .isInstanceOf(WalletNotFoundException.class)
                .hasMessageContaining("99");

        verify(walletTransactionRepository, never()).save(any());
        verify(kafkaTemplate, never()).send(anyString(), anyString(), anyString());
    }

    @Test
    void debit_concurrentSameIdempotencyKey_returnsExistingRecordAsIdempotent() throws Exception {
        DebitRequest request = buildRequest(1L, 300L, "key-race");
        Wallet wallet = buildWallet(1L, 1000L, 0L);
        WalletTransaction existingTx = buildTransaction(77L, 1L, 300L, 1000L, 700L, "key-race");

        when(walletTransactionRepository.findByIdempotencyKey("key-race"))
                .thenReturn(Optional.empty())         // Step 1: both threads see empty
                .thenReturn(Optional.of(existingTx)); // re-query after constraint violation
        when(walletRepository.findById(1L)).thenReturn(Optional.of(wallet));
        when(walletRepository.save(any(Wallet.class))).thenReturn(wallet);
        when(walletTransactionRepository.save(any(WalletTransaction.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate idempotency_key"));

        DebitResponse response = walletService.debit(request);

        assertThat(response.getTransactionId()).isEqualTo(77L);
        assertThat(response.isIdempotent()).isTrue();
        verify(kafkaTemplate, never()).send(anyString(), anyString(), anyString());
    }

    @Test
    void debit_optimisticLockConflict_propagatesException() {
        DebitRequest request = buildRequest(1L, 300L, "key-004");
        Wallet wallet = buildWallet(1L, 1000L, 0L);

        when(walletTransactionRepository.findByIdempotencyKey("key-004")).thenReturn(Optional.empty());
        when(walletRepository.findById(1L)).thenReturn(Optional.of(wallet));
        when(walletRepository.save(any(Wallet.class)))
                .thenThrow(new ObjectOptimisticLockingFailureException(Wallet.class, 1L));

        assertThatThrownBy(() -> walletService.debit(request))
                .isInstanceOf(ObjectOptimisticLockingFailureException.class);

        verify(walletTransactionRepository, never()).save(any());
        verify(kafkaTemplate, never()).send(anyString(), anyString(), anyString());
    }
}
