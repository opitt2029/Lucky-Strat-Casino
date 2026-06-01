package com.luckystar.member.exception;

public class FriendshipNotFoundException extends RuntimeException {
    public FriendshipNotFoundException() {
        super("Friendship not found");
    }
}
