package com.luckystar.member.exception;

public class FriendLimitExceededException extends RuntimeException {
    public FriendLimitExceededException() {
        super("Friend limit of 200 reached");
    }
}
