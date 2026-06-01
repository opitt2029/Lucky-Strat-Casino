package com.luckystar.member.service;

import com.luckystar.member.entity.OutboxEvent;
import com.luckystar.member.repository.OutboxEventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

import java.util.List;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OutboxPollerTest {

    @Mock
    private OutboxEventRepository outboxEventRepository;

    @Mock
    private KafkaTemplate<String, String> kafkaTemplate;

    @InjectMocks
    private OutboxPoller outboxPoller;

    private OutboxEvent buildPending() {
        OutboxEvent e = new OutboxEvent();
        e.setId(1L);
        e.setTopic("wallet.credit");
        e.setKafkaKey("42");
        e.setPayload("{}");
        e.setStatus(OutboxEvent.STATUS_PENDING);
        return e;
    }

    @Test
    @SuppressWarnings("unchecked")
    void publishPendingEvents_sendSucceeds_marksSent() {
        OutboxEvent event = buildPending();
        when(outboxEventRepository.findTop100ByStatusOrderByCreatedAtAsc(OutboxEvent.STATUS_PENDING))
                .thenReturn(List.of(event));
        SendResult<String, String> sendResult = mock(SendResult.class);
        when(kafkaTemplate.send("wallet.credit", "42", "{}"))
                .thenReturn(CompletableFuture.completedFuture(sendResult));

        outboxPoller.publishPendingEvents();

        assertThat(event.getStatus()).isEqualTo(OutboxEvent.STATUS_SENT);
        assertThat(event.getSentAt()).isNotNull();
        assertThat(event.getRetryCount()).isZero();
    }

    @Test
    void publishPendingEvents_sendFails_keepsPendingAndIncrementsRetry() {
        OutboxEvent event = buildPending();
        when(outboxEventRepository.findTop100ByStatusOrderByCreatedAtAsc(OutboxEvent.STATUS_PENDING))
                .thenReturn(List.of(event));
        when(kafkaTemplate.send("wallet.credit", "42", "{}"))
                .thenReturn(CompletableFuture.failedFuture(new RuntimeException("broker down")));

        outboxPoller.publishPendingEvents();

        assertThat(event.getStatus()).isEqualTo(OutboxEvent.STATUS_PENDING);
        assertThat(event.getSentAt()).isNull();
        assertThat(event.getRetryCount()).isEqualTo(1);
    }

    @Test
    void publishPendingEvents_noPending_doesNotTouchKafka() {
        when(outboxEventRepository.findTop100ByStatusOrderByCreatedAtAsc(OutboxEvent.STATUS_PENDING))
                .thenReturn(List.of());

        outboxPoller.publishPendingEvents();

        verifyNoInteractions(kafkaTemplate);
    }
}
