package com.luckystar.member.repository;

import com.luckystar.member.entity.DailyCheckin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface DailyCheckinRepository extends JpaRepository<DailyCheckin, Long> {

    Optional<DailyCheckin> findByPlayerIdAndCheckinDate(Long playerId, LocalDate date);

    Optional<DailyCheckin> findTopByPlayerIdOrderByCheckinDateDesc(Long playerId);
}
