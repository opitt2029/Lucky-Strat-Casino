package com.luckystar.member.exception;

public class TaskDefinitionNotFoundException extends RuntimeException {
    public TaskDefinitionNotFoundException() {
        super("Task definition not found");
    }
}
