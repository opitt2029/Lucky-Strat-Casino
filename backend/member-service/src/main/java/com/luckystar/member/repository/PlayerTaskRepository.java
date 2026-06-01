package com.luckystar.member.repository;

import com.luckystar.member.entity.PlayerTask;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlayerTaskRepository extends JpaRepository<PlayerTask, Long> {

    Optional<PlayerTask> findByPlayerIdAndTaskDefinition_Id(Long playerId, Long taskId);

    List<PlayerTask> findByPlayerId(Long playerId);

    Optional<PlayerTask> findByPlayerIdAndTaskDefinition_TaskCode(Long playerId, String taskCode);
}
