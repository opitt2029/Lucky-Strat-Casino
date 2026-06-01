package com.luckystar.member.consumer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.luckystar.member.dto.MemberRegisteredEvent;
import com.luckystar.member.service.NewGiftService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.support.Acknowledgment;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MemberRegisteredConsumerTest {

    @Mock
    private NewGiftService newGiftService;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private Acknowledgment ack;

    @InjectMocks
    private MemberRegisteredConsumer consumer;

    private static final String VALID_MESSAGE =
            "{\"playerId\":42,\"username\":\"alice\",\"email\":\"alice@example.com\"}";

    // ── Test 1 ───────────────────────────────────────────────────────────

    @Test
    void onMemberRegistered_validMessage_callsProcessNewGiftAndAcks() throws Exception {
        MemberRegisteredEvent event = new MemberRegisteredEvent(42L, "alice", "alice@example.com");
        when(objectMapper.readValue(VALID_MESSAGE, MemberRegisteredEvent.class)).thenReturn(event);

        consumer.onMemberRegistered(VALID_MESSAGE, ack);

        verify(newGiftService, times(1)).processNewGift(42L);
        verify(ack, times(1)).acknowledge();
    }

    // ── Test 2 ───────────────────────────────────────────────────────────

    @Test
    void onMemberRegistered_malformedJson_propagatesExceptionAndDoesNotAck() throws Exception {
        String badMessage = "not-valid-json";
        when(objectMapper.readValue(eq(badMessage), eq(MemberRegisteredEvent.class)))
                .thenThrow(new JsonProcessingException("Unexpected token") {});

        // 行為已改：consumer 不再吞例外，而是往上拋給 DefaultErrorHandler 處理（重試/送 DLT）
        assertThrows(JsonProcessingException.class,
                () -> consumer.onMemberRegistered(badMessage, ack));

        verify(newGiftService, never()).processNewGift(anyLong());
        verify(ack, never()).acknowledge();
    }

    // ── Test 3 ───────────────────────────────────────────────────────────

    @Test
    void onMemberRegistered_processNewGiftThrows_propagatesExceptionAndDoesNotAck() throws Exception {
        MemberRegisteredEvent event = new MemberRegisteredEvent(42L, "alice", "alice@example.com");
        when(objectMapper.readValue(VALID_MESSAGE, MemberRegisteredEvent.class)).thenReturn(event);
        doThrow(new RuntimeException("Kafka send failed"))
                .when(newGiftService).processNewGift(42L);

        // 例外往上拋，offset 不前進，交給 error handler 重試或送 DLT
        assertThrows(RuntimeException.class,
                () -> consumer.onMemberRegistered(VALID_MESSAGE, ack));

        verify(ack, never()).acknowledge();
    }
}
