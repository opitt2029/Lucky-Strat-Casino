package com.luckystar.member.repository;

import com.luckystar.member.entity.Friendship;
import com.luckystar.member.entity.FriendshipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    Optional<Friendship> findByRequesterIdAndReceiverId(Long requesterId, Long receiverId);

    @Query("SELECT COUNT(f) FROM Friendship f WHERE f.status = 'ACCEPTED' AND (f.requesterId = :playerId OR f.receiverId = :playerId)")
    long countAcceptedFriends(@Param("playerId") Long playerId);

    @Query("SELECT f FROM Friendship f WHERE f.status = 'ACCEPTED' AND (f.requesterId = :playerId OR f.receiverId = :playerId)")
    List<Friendship> findAcceptedFriends(@Param("playerId") Long playerId);

    List<Friendship> findByReceiverIdAndStatus(Long receiverId, FriendshipStatus status);
}
