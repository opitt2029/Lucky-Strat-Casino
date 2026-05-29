package com.luckystar.wallet.service;

import com.luckystar.wallet.dto.WalletBalanceResponse;
import com.luckystar.wallet.exception.WalletNotFoundException;
import com.luckystar.wallet.postgres.entity.Wallet;
import com.luckystar.wallet.postgres.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;

    @Transactional(readOnly = true, transactionManager = "postgresTransactionManager")
    public WalletBalanceResponse getBalance(Long playerId) {
        Wallet wallet = walletRepository.findById(playerId)
                .orElseThrow(() -> new WalletNotFoundException("Wallet not found for player: " + playerId));

        long balance = wallet.getBalance();
        long frozenAmount = wallet.getFrozenAmount();
        if (frozenAmount > balance) {
            log.error("Data inconsistency: frozenAmount={} > balance={} for playerId={}",
                    frozenAmount, balance, playerId);
        }
        long availableBalance = Math.max(0L, balance - frozenAmount);
        return new WalletBalanceResponse(balance, frozenAmount, availableBalance);
    }

    @Transactional(transactionManager = "postgresTransactionManager")
    public void createWallet(Long playerId) {
        if (walletRepository.existsById(playerId)) {
            log.warn("Wallet already exists for playerId={}, skipping creation", playerId);
            return;
        }
        Wallet wallet = Wallet.builder()
                .playerId(playerId)
                .balance(0L)
                .frozenAmount(0L)
                .version(0L)
                .build();
        try {
            walletRepository.saveAndFlush(wallet);
            log.info("Wallet created for playerId={}", playerId);
        } catch (DataIntegrityViolationException e) {
            log.warn("Concurrent wallet creation detected for playerId={}, ignoring", playerId);
        }
    }
}
