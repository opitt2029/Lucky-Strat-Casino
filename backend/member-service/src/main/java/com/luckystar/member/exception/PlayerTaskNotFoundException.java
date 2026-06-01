package com.luckystar.member.exception;

public class PlayerTaskNotFoundException extends RuntimeException {
    public PlayerTaskNotFoundException() {
        super("Player task not found");
    }
}
