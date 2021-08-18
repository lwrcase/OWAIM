
# OWAIM
An OSCAR server written in Node.js

## Why?
Since AIM's demise, I thought it would be a good idea to revive AIM (AOL Instant Messenger). This is similar to what Phoenix AIM provides but since their servers are closed source, I didn't want to use the service as I can't be sure that they aren't storing messages or doing other unsavory things.

AIM was my messenger of choice in its prime and the nostalgia factor alone drove me to create this project. Since emerging technologies such as Node.js are becoming more widely used, this project is a perfect candidate for server side messaging technology.

## How?
OSCAR (**O**pen **S**ystem for **C**ommunic**A**tion in **R**ealtime) is heavily documented across the web. Using example packet structures and known responses, I recreated the logic that was used to provide functioning Authorization, Data (BOS) and AOL Other Services (AOS) socket listeners.

## What?!?
AIM clients connect to an authorization server to exchange credentials. Once the credentials are validated, the authorization server sends an encoded ticket and the address and port to connect to for its Data connection.

This server software creates 3 listening sockets to provide Authorization, Data, and Transport services that AIM clients use for messaging.

The server keeps track of every session that connects and extends their properties with socket and user data as it moves through the Authorization, Data, and Transport sockets.

## What Works?
 - Authorization
 - Instant Messaging (ICBM)
 - Buddy Lists (Feedbag)
 - Chats
 - Profiles
 - Away Messages

## What Doesn't?
 - Directory services
 - Ad Services (this doesn't really seem like a bad thing though)
 - Email (POP)
 - Server Stored Buddy Icons and Meta Data
