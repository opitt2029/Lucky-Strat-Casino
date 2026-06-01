package com.luckystar.member.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "task_definitions")
@Getter
@Setter
@NoArgsConstructor
public class TaskDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_code", nullable = false, length = 50, unique = true)
    private String taskCode;

    @Column(name = "task_name", nullable = false, length = 100)
    private String taskName;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false, length = 30)
    private TaskType taskType;

    @Column(name = "reward_amount", nullable = false)
    private Long rewardAmount;

    @Column(name = "target_count", nullable = false)
    private Integer targetCount;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;
}
