package com.luckystar.member.exception;

public class SelfFriendRequestException extends RuntimeException {
    public SelfFriendRequestException() {
        super("Cannot send friend request to yourself");
    }
}
