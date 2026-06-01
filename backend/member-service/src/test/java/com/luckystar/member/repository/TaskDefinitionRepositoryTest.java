package com.luckystar.member.repository;

import com.luckystar.member.entity.TaskDefinition;
import com.luckystar.member.entity.TaskType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class TaskDefinitionRepositoryTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private TaskDefinitionRepository taskDefinitionRepository;

    @Test
    void findByTaskCode_existingCode_returnsNonEmpty() {
        em.persistAndFlush(buildTaskDef("FIRST_LOGIN", "首次登入獎勵", TaskType.FIRST_LOGIN, 100L, 1, true));

        Optional<TaskDefinition> result = taskDefinitionRepository.findByTaskCode("FIRST_LOGIN");

        assertThat(result).isPresent();
        assertThat(result.get().getTaskCode()).isEqualTo("FIRST_LOGIN");
    }

    @Test
    void findByTaskCode_nonExistentCode_returnsEmpty() {
        Optional<TaskDefinition> result = taskDefinitionRepository.findByTaskCode("NO_SUCH_TASK");

        assertThat(result).isEmpty();
    }

    @Test
    void findByIsActive_true_returnsOnlyActiveRows() {
        em.persistAndFlush(buildTaskDef("ACTIVE_1", "Active Task 1", TaskType.FIRST_LOGIN,  100L, 1, true));
        em.persistAndFlush(buildTaskDef("ACTIVE_2", "Active Task 2", TaskType.BET_COUNT,    200L, 10, true));
        em.persistAndFlush(buildTaskDef("INACTIVE", "Inactive Task", TaskType.INVITE_FRIEND, 50L, 1, false));

        List<TaskDefinition> result = taskDefinitionRepository.findByIsActive(true);

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(TaskDefinition::getIsActive);
    }

    @Test
    void findByTaskTypeAndIsActive_dailyCheckin_returnsOnlyMatchingRows() {
        em.persistAndFlush(buildTaskDef("CHECKIN_1", "簽到1天", TaskType.DAILY_CHECKIN,  50L, 1,  true));
        em.persistAndFlush(buildTaskDef("CHECKIN_7", "簽到7天", TaskType.DAILY_CHECKIN, 200L, 7,  true));
        em.persistAndFlush(buildTaskDef("BET_10",    "下注10次", TaskType.BET_COUNT,    100L, 10, true));

        List<TaskDefinition> result = taskDefinitionRepository.findByTaskTypeAndIsActive(TaskType.DAILY_CHECKIN, true);

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(t -> t.getTaskType() == TaskType.DAILY_CHECKIN);
    }

    // ── helper ───────────────────────────────────────────────────────────

    private TaskDefinition buildTaskDef(String code, String name, TaskType type,
                                        Long reward, int target, boolean active) {
        TaskDefinition td = new TaskDefinition();
        td.setTaskCode(code);
        td.setTaskName(name);
        td.setTaskType(type);
        td.setRewardAmount(reward);
        td.setTargetCount(target);
        td.setIsActive(active);
        return td;
    }
}
