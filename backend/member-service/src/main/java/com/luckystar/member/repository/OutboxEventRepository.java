package com.luckystar.member.repository;

import com.luckystar.member.entity.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {

    // 依建立時間由舊到新，撈出一批未發送事件（一次最多 100 筆，避免單輪過載）
    List<OutboxEvent> findTop100ByStatusOrderByCreatedAtAsc(String status);
}
