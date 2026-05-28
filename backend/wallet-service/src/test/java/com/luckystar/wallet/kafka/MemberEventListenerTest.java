package com.luckystar.wallet.kafka;

import com.luckystar.wallet.service.WalletService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.support.Acknowledgment;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class MemberEventListenerTest {

    @Mock
    WalletService walletService;

    @InjectMocks
    MemberEventListener listener;

    @Test
    void handleMemberRegistered_validMessage_callsCreateWalletAndAcks() {
        Acknowledgment ack = mock(Acknowledgment.class);

        listener.handleMemberRegistered("42", ack);

        verify(walletService, times(1)).createWallet(42L);
        verify(ack, times(1)).acknowledge();
    }

    @Test
    void handleMemberRegistered_messageWithWhitespace_isTrimmedAndAcked() {
        Acknowledgment ack = mock(Acknowledgment.class);

        listener.handleMemberRegistered("  42  ", ack);

        verify(walletService, times(1)).createWallet(42L);
        verify(ack, times(1)).acknowledge();
    }

    @Test
    void handleMemberRegistered_invalidMessage_throwsAndDoesNotAck() {
        Acknowledgment ack = mock(Acknowledgment.class);

        // 格式錯誤拋 NumberFormatException → 由 error handler 直送 DLT，不可在此 ack
        assertThrows(NumberFormatException.class,
                () -> listener.handleMemberRegistered("not-a-number", ack));

        verify(walletService, never()).createWallet(any());
        verify(ack, never()).acknowledge();
    }

    @Test
    void handleMemberRegistered_transientFailure_propagatesAndDoesNotAck() {
        Acknowledgment ack = mock(Acknowledgment.class);
        doThrow(new RuntimeException("DB down")).when(walletService).createWallet(42L);

        // 暫時性失敗向外拋 → error handler 重試/送 DLT，不可 ack 否則事件遺失
        assertThrows(RuntimeException.class,
                () -> listener.handleMemberRegistered("42", ack));

        verify(walletService, times(1)).createWallet(42L);
        verify(ack, never()).acknowledge();
    }
}
