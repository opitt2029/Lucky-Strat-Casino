package com.luckystar.member.service;

import com.luckystar.member.dto.RegisterRequest;
import com.luckystar.member.dto.RegisterResponse;
import com.luckystar.member.entity.Member;
import com.luckystar.member.exception.MemberAlreadyExistsException;
import com.luckystar.member.repository.MemberRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private OutboxService outboxService;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest buildRequest() {
        RegisterRequest req = new RegisterRequest();
        req.setUsername("testuser");
        req.setEmail("test@example.com");
        req.setPassword("Password1");
        return req;
    }

    private void stubSuccessfulSave() {
        when(memberRepository.save(any(Member.class))).thenAnswer(inv -> {
            Member m = inv.getArgument(0);
            m.setId(1L);
            m.setCreatedAt(LocalDateTime.now());
            m.setUpdatedAt(LocalDateTime.now());
            return m;
        });
    }

    @Test
    void register_success() {
        RegisterRequest request = buildRequest();

        when(memberRepository.existsByUsername("testuser")).thenReturn(false);
        when(memberRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Password1")).thenReturn("$2a$hashed");
        stubSuccessfulSave();

        RegisterResponse response = authService.register(request);

        verify(memberRepository, times(1)).save(any(Member.class));
        // 事件寫入 outbox（不再直接送 Kafka）：與會員寫入同一交易
        verify(outboxService, times(1)).save(eq("member.registered"), eq("1"), any());
        assertEquals("testuser", response.getUsername());
    }

    @Test
    void register_duplicateUsername() {
        RegisterRequest request = buildRequest();

        when(memberRepository.existsByUsername("testuser")).thenReturn(true);

        assertThrows(MemberAlreadyExistsException.class, () -> authService.register(request));
        verify(memberRepository, never()).save(any());
        verify(outboxService, never()).save(anyString(), anyString(), any());
    }

    @Test
    void register_duplicateEmail() {
        RegisterRequest request = buildRequest();

        when(memberRepository.existsByUsername("testuser")).thenReturn(false);
        when(memberRepository.existsByEmail("test@example.com")).thenReturn(true);

        assertThrows(MemberAlreadyExistsException.class, () -> authService.register(request));
    }

    @Test
    void register_outboxFailure_propagates() {
        // 行為已改：outbox 寫入與會員寫入同一交易，失敗時應往上拋觸發 rollback，
        // 不再像舊版那樣 best-effort 吞掉錯誤
        RegisterRequest request = buildRequest();

        when(memberRepository.existsByUsername("testuser")).thenReturn(false);
        when(memberRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Password1")).thenReturn("$2a$hashed");
        stubSuccessfulSave();
        doThrow(new IllegalStateException("outbox unavailable"))
                .when(outboxService).save(anyString(), anyString(), any());

        assertThrows(IllegalStateException.class, () -> authService.register(request));
        verify(memberRepository, times(1)).save(any(Member.class));
    }
}
