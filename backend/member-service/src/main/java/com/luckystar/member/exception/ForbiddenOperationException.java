package com.luckystar.member.exception;

public class ForbiddenOperationException extends RuntimeException {
    public ForbiddenOperationException() {
        super("You are not authorized to perform this action");
    }
}
