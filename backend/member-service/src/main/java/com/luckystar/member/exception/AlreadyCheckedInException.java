package com.luckystar.member.exception;

public class AlreadyCheckedInException extends RuntimeException {
    public AlreadyCheckedInException() {
        super("Already checked in today");
    }
}
