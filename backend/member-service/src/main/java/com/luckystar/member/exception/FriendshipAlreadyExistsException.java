package com.luckystar.member.exception;

public class FriendshipAlreadyExistsException extends RuntimeException {
    public FriendshipAlreadyExistsException() {
        super("Friend request already exists or already friends");
    }
}
