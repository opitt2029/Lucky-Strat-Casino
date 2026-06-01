package com.luckystar.member.repository;

import com.luckystar.member.entity.PlayerTask;
import com.luckystar.member.entity.TaskDefinition;
import com.luckystar.member.entity.TaskType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class PlayerTaskRepositoryTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private PlayerTaskRepository playerTaskRepository;

    private TaskDefinition savedTaskDef;

    @BeforeEach
    void setUp() {
        TaskDefinition td = new TaskDefinition();
        td.setTaskCode("DAILY_CHECKIN_1");
        td.setTaskName("連續簽到第1天");
        td.setTaskType(TaskType.DAILY_CHECKIN);
        td.setRewardAmount(50L);
        td.setTargetCount(1);
        td.setIsActive(true);
        savedTaskDef = em.persistAndFlush(td);
    }

    @Test
    void findByPlayerIdAndTaskDefinition_Id_savedPlayerTask_retrievedCorrectly() {
        PlayerTask pt = buildPlayerTask(1L, savedTaskDef, 0, false);
        em.persistAndFlush(pt);

        Optional<PlayerTask> result = playerTaskRepository
                .findByPlayerIdAndTaskDefinition_Id(1L, savedTaskDef.getId());

        assertThat(result).isPresent();
        assertThat(result.get().getPlayerId()).isEqualTo(1L);
        assertThat(result.get().getTaskDefinition().getId()).isEqualTo(savedTaskDef.getId());
    }

    @Test
    void findByPlayerIdAndTaskDefinition_TaskCode_correctPlayerAndCode_returnsNonEmpty() {
        PlayerTask pt = buildPlayerTask(2L, savedTaskDef, 1, true);
        em.persistAndFlush(pt);

        Optional<PlayerTask> result = playerTaskRepository
                .findByPlayerIdAndTaskDefinition_TaskCode(2L, "DAILY_CHECKIN_1");

        assertThat(result).isPresent();
        assertThat(result.get().getPlayerId()).isEqualTo(2L);
    }

    @Test
    void findByPlayerIdAndTaskDefinition_TaskCode_wrongPlayer_returnsEmpty() {
        PlayerTask pt = buildPlayerTask(3L, savedTaskDef, 0, false);
        em.persistAndFlush(pt);

        // 用不同的 playerId（99L）查詢 → 應為空
        Optional<PlayerTask> result = playerTaskRepository
                .findByPlayerIdAndTaskDefinition_TaskCode(99L, "DAILY_CHECKIN_1");

        assertThat(result).isEmpty();
    }

    // ── helper ───────────────────────────────────────────────────────────

    private PlayerTask buildPlayerTask(Long playerId, TaskDefinition td, int progress, boolean completed) {
        PlayerTask pt = new PlayerTask();
        pt.setPlayerId(playerId);
        pt.setTaskDefinition(td);
        pt.setProgress(progress);
        pt.setIsCompleted(completed);
        pt.setCompletedAt(null);
        return pt;
    }
}
