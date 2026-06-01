package com.luckystar.member.repository;

import com.luckystar.member.entity.TaskDefinition;
import com.luckystar.member.entity.TaskType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TaskDefinitionRepository extends JpaRepository<TaskDefinition, Long> {

    Optional<TaskDefinition> findByTaskCode(String taskCode);

    List<TaskDefinition> findByTaskTypeAndIsActive(TaskType taskType, Boolean isActive);

    List<TaskDefinition> findByIsActive(Boolean isActive);
}
