package com.luckystar.member.service;

import com.luckystar.member.entity.OutboxEvent;
import com.luckystar.member.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Outbox 背景投遞器：定時把 outbox_events 內 PENDING 的事件送往 Kafka。
 *
 * 投遞保證為 at-least-once（至少一次）：若送達後、標記 SENT 前進程崩潰，下次會重送。
 * 重複投遞由下游的 idempotencyKey（wallet.credit）與 isNewGiftClaimed 旗標（new gift）防護。
 *
 * 注意（單實例假設）：本實作未對撈出的列加鎖，多實例同時輪詢會重複送同一筆。
 * production 多副本部署時，應改用 SELECT ... FOR UPDATE SKIP LOCKED 或 ShedLock 做互斥。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxPoller {

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    @Scheduled(fixedDelayString = "${outbox.poll-interval-ms:5000}")
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEvent> pending =
                outboxEventRepository.findTop100ByStatusOrderByCreatedAtAsc(OutboxEvent.STATUS_PENDING);
        if (pending.isEmpty()) {
            return;
        }

        for (OutboxEvent event : pending) {
            try {
                // .get(10s)：同步等待 broker 確認，真正送達才標 SENT（搭配 producer acks=all）
                kafkaTemplate.send(event.getTopic(), event.getKafkaKey(), event.getPayload())
                        .get(10, TimeUnit.SECONDS);
                event.setStatus(OutboxEvent.STATUS_SENT);
                event.setSentAt(LocalDateTime.now());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                event.setRetryCount(event.getRetryCount() + 1);
                log.error("Outbox publish interrupted for event id={}", event.getId(), e);
                break; // 執行緒被中斷，停止本輪
            } catch (Exception e) {
                // 投遞失敗：保持 PENDING、累加 retry，下一輪再試
                event.setRetryCount(event.getRetryCount() + 1);
                log.error("Failed to publish outbox event id={} topic={}: {}",
                        event.getId(), event.getTopic(), e.getMessage());
            }
        }
        // @Transactional 結束時，managed entity 的 status/sentAt/retryCount 變更會自動 flush
    }
}
