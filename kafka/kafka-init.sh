#!/bin/bash

echo "Creating Kafka topics..."

kafka-topics --create \
  --if-not-exists \
  --bootstrap-server lucky-star-kafka:29092 \
  --replication-factor 1 \
  --partitions 3 \
  --topic member.registered

kafka-topics --create \
  --if-not-exists \
  --bootstrap-server lucky-star-kafka:29092 \
  --replication-factor 1 \
  --partitions 3 \
  --topic wallet.debit

kafka-topics --create \
  --if-not-exists \
  --bootstrap-server lucky-star-kafka:29092 \
  --replication-factor 1 \
  --partitions 3 \
  --topic wallet.credit

kafka-topics --create \
  --if-not-exists \
  --bootstrap-server lucky-star-kafka:29092 \
  --replication-factor 1 \
  --partitions 3 \
  --topic game.result

kafka-topics --create \
  --if-not-exists \
  --bootstrap-server lucky-star-kafka:29092 \
  --replication-factor 1 \
  --partitions 3 \
  --topic rank.update

kafka-topics --create \
  --if-not-exists \
  --bootstrap-server lucky-star-kafka:29092 \
  --replication-factor 1 \
  --partitions 3 \
  --topic notification.push

echo "Kafka topics created."