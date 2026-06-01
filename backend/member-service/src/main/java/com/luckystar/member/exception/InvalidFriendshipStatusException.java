package com.luckystar.member.exception;

public class InvalidFriendshipStatusException extends RuntimeException {
    public InvalidFriendshipStatusException() {
        super("Invalid friendship status for this operation");
    }
}
