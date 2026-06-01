package com.luckystar.member.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.luckystar.member.entity.OutboxEvent;
import com.luckystar.member.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OutboxService {

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    /**
     * 把要送出的 Kafka 事件寫進 outbox 表（狀態 PENDING）。
     *
     * 刻意「不」標 @Transactional：沿用呼叫端的交易（Propagation.REQUIRED 預設行為），
     * 讓「業務資料寫入」與「事件寫入」落在同一個交易裡——這正是 Outbox 的核心。
     * 因此呼叫端必須是 @Transactional 方法，否則就失去原子性保證。
     */
    public void save(String topic, String key, Object payload) {
        try {
            OutboxEvent event = new OutboxEvent();
            event.setTopic(topic);
            event.setKafkaKey(key);
            event.setPayload(objectMapper.writeValueAsString(payload));
            outboxEventRepository.save(event);
        } catch (JsonProcessingException e) {
            // 序列化失敗屬程式錯誤，往上拋讓整個交易回滾
            throw new IllegalStateException("Failed to serialize outbox payload for topic " + topic, e);
        }
    }
}
