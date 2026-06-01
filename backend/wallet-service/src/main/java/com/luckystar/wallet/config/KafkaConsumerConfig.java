package com.luckystar.wallet.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.ContainerProperties;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

/**
 * Kafka consumer 錯誤處理設定。
 *
 * <p>處理策略：暫時性錯誤（如 DB 斷線）重試 3 次（間隔 2 秒），耗盡後把訊息送進
 * {@code <topic>.DLT}（Dead Letter Topic），避免毒丸訊息卡死整個 partition。
 * JSON 格式錯誤（{@link JsonProcessingException}）與參數錯誤（{@link IllegalArgumentException}）
 * 屬「不可重試」，直接送 DLT 不浪費重試次數。
 *
 * <p>⚠️ 注意：本類別內**每個 bean 方法名稱必須唯一**。Spring Boot 3.2+ 預設
 * {@code @Configuration.enforceUniqueMethods=true}，若出現兩個同名 @Bean 方法
 * （即使參數不同）會在啟動時丟 {@code BeanDefinitionParsingException} 導致服務無法啟動。
 */
@EnableKafka
@Configuration
public class KafkaConsumerConfig {

    /** 預設目的地解析器：把 {@code <topic>} 的失敗訊息送到 {@code <topic>.DLT}（如 wallet.credit.DLT）。 */
    @Bean
    public DeadLetterPublishingRecoverer deadLetterRecoverer(KafkaTemplate<String, String> template) {
        return new DeadLetterPublishingRecoverer(template);
    }

    /** 重試 3 次（間隔 2s）仍失敗則送 DLT；格式/參數錯誤視為不可重試，直接送 DLT。 */
    @Bean
    public DefaultErrorHandler kafkaErrorHandler(DeadLetterPublishingRecoverer recoverer) {
        DefaultErrorHandler handler = new DefaultErrorHandler(recoverer, new FixedBackOff(2000L, 3L));
        handler.addNotRetryableExceptions(
                JsonProcessingException.class,
                IllegalArgumentException.class
        );
        return handler;
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, String> kafkaListenerContainerFactory(
            ConsumerFactory<String, String> consumerFactory,
            DefaultErrorHandler kafkaErrorHandler) {
        ConcurrentKafkaListenerContainerFactory<String, String> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.setCommonErrorHandler(kafkaErrorHandler);
        // 手動 ack：listener 成功處理後才呼叫 ack.acknowledge()，避免訊息遺失
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL_IMMEDIATE);
        return factory;
    }
}
