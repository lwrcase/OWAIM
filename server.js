const ChatManager = require('./chatmanager.js');
const Family = require('./family.js');
const FLAP = require('./flap.js');
const Net = require('net');
const Options = require('./options.js');
const Parameter = require('./parameter.js');
const SessionManager = require('./sessionmanager.js');
const SNAC = require('./snac.js');
const SSI = require('./ssi.js');
const User = require('./user.js');
const Util = require('./util.js');
const Fragment = require('./fragment.js');

var _options = new Options(process.argv);

var _sessions = new SessionManager();

var _chatrooms = new ChatManager();

function SendData(session, requestId, channel, bytes, echo) {
    session.sequence++;
    if (session.sequence > 65535) { session.sequence = 0; }
    if (channel === 2 && requestId > 0) { bytes.splice(6, 4, ...Util.Bit.UInt32ToBytes(requestId)); }
    let packet = new FLAP(channel, session.sequence, bytes);
    if (echo) { console.log('packet', JSON.stringify(Util.Bit.BytesBuffer(packet.ToBytes()))); }
    session.socket.write(Util.Bit.BytesBuffer(packet.ToBytes()));
}

let authServer = Net.createServer(function (socket) {
    let session = _sessions.add({ sequence: 0, socket: socket, buffer: [] });
    session.socket.on('error', function (err) {
        console.log('<!> Auth server socket error:', err);
    });
    session.socket.on('end', function () {
        delete session.socket;
        delete session.sequence;
        if (!session.user) {
            _sessions.remove(session);
        }
        delete session;
    });
    session.socket.on('data', async function (data) {
        var _bytes = Util.Bit.BufferBytes(data);
        session.buffer = session.buffer.concat(_bytes);
        var endProcStream = false;
        if (session.buffer.length < 10) { return; }
        while (session.buffer.length > 0 & !endProcStream) {
            if (session.buffer.slice(0, 1)[0] !== 0x2a) {
                console.log('<!> non FLAP packet recieved on BOS socket!');
                return;
            }
            var size = Util.Bit.BytesToUInt16(session.buffer.slice(4, 6));
            if (session.buffer.length >= (6 + size)) {
                await ProcessRequest(session, session.buffer.slice(0, 6), session.buffer.slice(6, 6 + size), session.buffer.splice(0, 6 + size));
            } else {
                endProcStream = true;
            }
        }
    });
    SendData(session, 0, 1, Util.Constants._FLAP_VERSION);
    async function ProcessRequest(session, header, data, bytes) {
        // get FLAP header.
        let flap = new FLAP(header);
    
        // expect: 2, channel: SNAC
        if (flap.channel === 2) {
            // get SNAC packet.
            let snac = new SNAC(data);

            // expect: 0x00 0x17 0x00 0x06
            // method: auth key request
            if (snac.foodGroup === 0x17 && snac.type === 0x06) {
                let screenName = snac.parameters.find(function (item) { return item.type === 0x01 });
                if (screenName) {
                    let user = await User.getSingleUser(Util.Bit.BytesToString(screenName.data));
                    if (!user) {
                        // user not found.
                        SendData(session, 0, 2, new SNAC({
                            foodGroup: 0x0017,
                            type: 0x0003,
                            flags: 0,
                            requestId: 0,
                            parameters: [
                                new Parameter({ type: 0x01, data: screenName.data }),
                                new Parameter({ type: 0x04, data: Util.Bit.BufferBytes('https://www.lwrca.se/owaim/unregistered') }),
                                new Parameter({ type: 0x08, data: Util.Int16ToBytes(4) })
                            ]
                        }).ToBytes());
                        return;
                    }
                    if (user.ScreenName !== Util.Bit.BytesToString(screenName.data)) {
                        // user not the same.
                        SendData(session, 0, 2, new SNAC({
                            foodGroup: 0x0017,
                            type: 0x0003,
                            flags: 0,
                            requestId: 0,
                            parameters: [
                                new Parameter({ type: 0x01, data: screenName.data }),
                                new Parameter({ type: 0x04, data: Util.Bit.BufferBytes('https://www.lwrca.se/owaim/unregistered') }),
                                new Parameter({ type: 0x08, data: Util.Int16ToBytes(7) })
                            ]
                        }).ToBytes());
                        return;
                    }
                    if (user.Deleted) {
                        // user deleted.
                        SendData(session, 0, 2, new SNAC({
                            foodGroup: 0x0017,
                            type: 0x0003,
                            flags: 0,
                            requestId: 0,
                            parameters: [
                                new Parameter({ type: 0x01, data: screenName.data }),
                                new Parameter({ type: 0x04, data: Util.Bit.BufferBytes('https://www.lwrca.se/owaim/deleted') }),
                                new Parameter({ type: 0x08, data: Util.Int16ToBytes(8) })
                            ]
                        }).ToBytes());
                        return;
                    }
                    if (user.Suspended) {
                        // user suspended.
                        SendData(session, 0, 2, new SNAC({
                            foodGroup: 0x0017,
                            type: 0x0003,
                            flags: 0,
                            requestId: 0,
                            parameters: [
                                new Parameter({ type: 0x01, data: screenName.data }),
                                new Parameter({ type: 0x04, data: Util.Bit.BufferBytes('https://www.lwrca.se/owaim/suspended') }),
                                new Parameter({ type: 0x08, data: Util.Int16ToBytes(17) })
                            ]
                        }).ToBytes());
                        return;
                    }
                    session.ticket = Util.Strings.GenerateTicket();
                    SendData(session, 0, 2, new SNAC({
                        foodGroup: 0x0017,
                        type: 0x0007,
                        flags: 0,
                        requestId: 0,
                        extensions: {
                            authKey: session.ticket
                        }
                    }).ToBytes());
                    return;
                }
                // user not sent.
                SendData(session, 0, 2, new SNAC({
                    foodGroup: 0x0017,
                    type: 0x0003,
                    flags: 0,
                    requestId: 0,
                    parameters: [
                        new Parameter({ type: 0x01, data: screenName }),
                        new Parameter({ type: 0x04, data: 'https://www.lwrca.se/owaim/unregistered' }),
                        new Parameter({ type: 0x08, data: 7 })
                    ]
                }).ToBytes());
                return;
            }
    
            // expect: 0x00 0x17 0x00 0x02
            // method: auth
            if (snac.foodGroup === 0x17 && snac.type === 0x02) {
                let screenName = snac.parameters.find(function (item) { return item.type === 0x01 });
                let roastedPassword = snac.parameters.find(function (item) { return item.type === 0x25 });
                if (screenName && roastedPassword) {
                    let user = await User.getSingleUser(Util.Bit.BytesToString(screenName.data));
                    if (!user) {
                        // user not found.
                        SendData(session, 0, 2, new SNAC({
                            foodGroup: 0x0017,
                            type: 0x0003,
                            flags: 0,
                            requestId: 0,
                            parameters: [
                                new Parameter({ type: 0x01, data: screenName.data }),
                                new Parameter({ type: 0x04, data: Util.Bit.BufferBytes('https://www.lwrca.se/owaim/unregistered') }),
                                new Parameter({ type: 0x08, data: Util.Int16ToBytes(4) })
                            ]
                        }).ToBytes());
                        return;
                    }
                    if (user.ScreenName !== Util.Bit.BytesToString(screenName.data)) {
                        // user not the same.
                        SendData(session, 0, 2, new SNAC({
                            foodGroup: 0x0017,
                            type: 0x0003,
                            flags: 0,
                            requestId: 0,
                            parameters: [
                                new Parameter({ type: 0x01, data: screenName.data }),
                                new Parameter({ type: 0x04, data: Util.Bit.BufferBytes('https://www.lwrca.se/owaim/unregistered') }),
                                new Parameter({ type: 0x08, data: Util.Int16ToBytes(7) })
                            ]
                        }).ToBytes());
                        return;
                    }
                    if (user.Deleted) {
                        // user deleted.
                        SendData(session, 0, 2, new SNAC({
                            foodGroup: 0x0017,
                            type: 0x0003,
                            flags: 0,
                            requestId: 0,
                            parameters: [
                                new Parameter({ type: 0x01, data: screenName.data }),
                                new Parameter({ type: 0x04, data: Util.Bit.BufferBytes('https://www.lwrca.se/owaim/deleted') }),
                                new Parameter({ type: 0x08, data: Util.Int16ToBytes(8) })
                            ]
                        }).ToBytes());
                        return;
                    }
                    if (user.Suspended) {
                        // user suspended.
                        SendData(session, 0, 2, new SNAC({
                            foodGroup: 0x0017,
                            type: 0x0003,
                            flags: 0,
                            requestId: 0,
                            parameters: [
                                new Parameter({ type: 0x01, data: screenName.data }),
                                new Parameter({ type: 0x04, data: Util.Bit.BufferBytes('https://www.lwrca.se/owaim/suspended') }),
                                new Parameter({ type: 0x08, data: Util.Int16ToBytes(17) })
                            ]
                        }).ToBytes());
                        return;
                    }
                    let roastedPasswordHash = Util.Strings.BytesToHexString(roastedPassword.data);
                    let userPasswordHash = Util.Strings.BytesToHexString(Util.Strings.RoastPassword(session.ticket, user.Password));
                    if (roastedPasswordHash === userPasswordHash) {
                        session.cookie = Util.Strings.BytesToHexString(Util.Bit.BufferBytes(Util.Strings.GenerateCookie()));
                        session.user = user;
                        // user good.
                        SendData(session, 0, 2, new SNAC({
                            foodGroup: 0x0017,
                            type: 0x0003,
                            flags: 0,
                            requestId: 0,
                            parameters: [
                                new Parameter({ type: 0x01, data: Util.Bit.BufferBytes(user.ScreenName) }),
                                new Parameter({ type: 0x05, data: Util.Bit.BufferBytes([_options.ip, _options.bosPort].join(':')) }),
                                new Parameter({ type: 0x06, data: Util.Strings.HexStringToBytes(session.cookie) }),
                                new Parameter({ type: 0x11, data: Util.Bit.BufferBytes(session.user.EmailAddress) }),
                                new Parameter({ type: 0x54, data: Util.Bit.BufferBytes('https://www.lwrca.se/owaim/change-password') })
                            ]
                        }).ToBytes());
                        return;
                    }
                    // invalid password.
                    SendData(session, 0, 2, new SNAC({
                        foodGroup: 0x0017,
                        type: 0x0003,
                        flags: 0,
                        requestId: 0,
                        parameters: [
                            new Parameter({ type: 0x01, data: screenName.data }),
                            new Parameter({ type: 0x04, data: Util.Bit.BufferBytes('https://www.lwrca.se/owaim/password') }),
                            new Parameter({ type: 0x08, data: Util.Bit.UInt16ToBytes(5) })
                        ]
                    }).ToBytes());
                    return;
                }
                // user not sent.
                SendData(session, 0, 2, new SNAC({
                    foodGroup: 0x0017,
                    type: 0x0003,
                    flags: 0,
                    requestId: 0,
                    parameters: [
                        new Parameter({ type: 0x01, data: screenName.data }),
                        new Parameter({ type: 0x04, data: Util.Bit.BufferBytes('https://www.lwrca.se/owaim/unregistered') }),
                        new Parameter({ type: 0x08, data: Util.Bit.UInt16ToBytes(7) })
                    ]
                }).ToBytes());
                return;
            }
    
            // All other SNACs
            console.log('Auth unhandled', snac);
        }
    
        // expect: 4, channel: disconnect
        if (flap.channel === 4) {
            return;
        }
    }
});
authServer.listen(_options.authPort, _options.ip).on('listening', function () { console.log('Auth socket listening on', authServer.address()); }).on('error', function (err) { console.log('Auth server socket error:', err); });

let bosServer = Net.createServer(function (socket) {
    let session = _sessions.add({ sequence: 0, socket: socket, buffer: [] });
    session.socket.on('error', function (err) {
        console.log('<!> BOS server socket error:', err);
    });
    session.socket.on('end', async function () {
        delete session.socket;
        delete session.sequence;
        if (session.user) {
            session.user.SignedOn = false;
            await session.user.updateStatus(session, _sessions, SendData);
        }
        _sessions.remove(session);
        delete session;
    });
    session.socket.on('data', async function (data) {
        var _bytes = Util.Bit.BufferBytes(data);
        session.buffer = session.buffer.concat(_bytes);
        var endProcStream = false;
        if (session.buffer.length < 10) { return; }
        while (session.buffer.length > 0 & !endProcStream) {
            if (session.buffer.slice(0, 1)[0] !== 0x2a) {
                console.log('<!> non FLAP packet recieved on BOS socket!');
                return;
            }
            var size = Util.Bit.BytesToUInt16(session.buffer.slice(4, 6));
            if (session.buffer.length >= (6 + size)) {
                await ProcessRequest(session, session.buffer.slice(0, 6), session.buffer.slice(6, 6 + size), session.buffer.splice(0, 6 + size));
            } else {
                endProcStream = true;
            }
        }
    });
    SendData(session, 0, 1, Util.Constants._FLAP_VERSION);
    async function ProcessRequest(session, header, data, bytes) {
        // get FLAP header.
        let flap = new FLAP(header);

        switch (flap.channel) {
            case 1: { // auth
                if (data.length > 4) {
                    let parameters = Parameter.GetParameters(0, 0, data.slice(4));
                    let cookie = parameters.find(function (item) { return item.type === 0x06; });
                    if (cookie) {
                        let existingSession = _sessions.item({ cookie: Util.Strings.BytesToHexString(cookie.data) });
                        if (existingSession) {
                            _sessions.reconcile(existingSession, session);
                            SendData(session, 0, 2, new SNAC({
                                foodGroup: 0x0001,
                                type: 0x0003,
                                flags: 0,
                                requestId: 0,
                                extensions: {
                                    families: [1, 2, 3, 4, 6, 7, 8, 9, 16, 10, 24, 11, 19, 21, 34, 37, 15]
                                }
                            }).ToBytes());
                            return;
                        }
                        SendData(session, 0, 4, []);
                        return;
                    }
                    SendData(session, 0, 4, []);
                    return;
                }
                SendData(session, 0, 4, []);
                return;
            }
            case 2: { // SNAC
                // get SNAC packet
                let snac = new SNAC(data);

                switch (snac.foodGroup) {
                    case 0x0001: { // generic service controls
                        switch (snac.type) {
                            case 0x02: { // service client ready.
                                console.log('<+>', session.user.ScreenName, 'has signed on successfully.');
                                session.user.SignedOn = true;
                                session.user.SignedOnTimestamp = Util.Dates.GetTimestamp();
                                await session.user.updateStatus(session, _sessions, SendData);
                                return;
                            }
                            case 0x04: { // new service request.
                                if (!session.services) { session.services = []; }
                                var extCookie = snac.parameters ? snac.parameters.find(function(item) { return item.type === 0x01; }) : undefined;
                                let serviceSession = { groupId: Util.Bit.BytesToUInt16(snac.groupId) };
                                if (extCookie) {
                                    var dataExtCokie = [...extCookie.data];
                                    let extCookieType = dataExtCokie.splice(0, 2);
                                    let extCookieLen = dataExtCokie.splice(0, 1);
                                    let extCookieData = dataExtCokie.splice(0, Util.Bit.BytesToUInt8(extCookieLen));
                                    serviceSession.cookie = [Util.Bit.BytesToString(extCookieData), session.user.ScreenName].join('.');
                                } else {
                                    serviceSession.cookie = session.user.ScreenName;
                                }
                                session.services.push(serviceSession);
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x0001,
                                    type: 0x0005,
                                    flags: 0,
                                    requestId: snac.requestId,
                                    parameters: [
                                        new Parameter({ type: 0x0d, data: snac.groupId }),
                                        new Parameter({ type: 0x05, data: Util.Bit.BufferBytes([_options.ip, _options.aosPort].join(':')) }),
                                        new Parameter({ type: 0x06, data: Util.Bit.BufferBytes(serviceSession.cookie) })
                                    ]
                                }).ToBytes());
                                return;
                            }
                            case 0x06: { // rate limits request.
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x0001,
                                    type: 0x0007,
                                    flags: 0,
                                    requestId: 0
                                }).ToBytes().concat([
                                    0x00, 0x05, 0x00, 0x01, 0x00, 0x00, 0x00, 0x50,
                                    0x00, 0x00, 0x09, 0xc4, 0x00, 0x00, 0x07, 0xd0,
                                    0x00, 0x00, 0x05, 0xdc, 0x00, 0x00, 0x03, 0x20,
                                    0x00, 0x00, 0x16, 0xdc, 0x00, 0x00, 0x17, 0x70,
                                    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00,
                                    0x00, 0x00, 0x50, 0x00, 0x00, 0x0b, 0xb8, 0x00,
                                    0x00, 0x07, 0xd0, 0x00, 0x00, 0x05, 0xdc, 0x00,
                                    0x00, 0x03, 0xe8, 0x00, 0x00, 0x17, 0x70, 0x00,
                                    0x00, 0x17, 0x70, 0x00, 0x00, 0x00, 0x7b, 0x00,
                                    0x00, 0x03, 0x00, 0x00, 0x00, 0x1e, 0x00, 0x00,
                                    0x0e, 0x74, 0x00, 0x00, 0x0f, 0xa0, 0x00, 0x00,
                                    0x05, 0xdc, 0x00, 0x00, 0x03, 0xe8, 0x00, 0x00,
                                    0x17, 0x70, 0x00, 0x00, 0x17, 0x70, 0x00, 0x00,
                                    0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00,
                                    0x14, 0x00, 0x00, 0x15, 0x7c, 0x00, 0x00, 0x14,
                                    0xb4, 0x00, 0x00, 0x10, 0x68, 0x00, 0x00, 0x0b,
                                    0xb8, 0x00, 0x00, 0x17, 0x70, 0x00, 0x00, 0x1f,
                                    0x40, 0x00, 0x00, 0x00, 0x7b, 0x00, 0x00, 0x05,
                                    0x00, 0x00, 0x00, 0x0a, 0x00, 0x00, 0x15, 0x7c,
                                    0x00, 0x00, 0x14, 0xb4, 0x00, 0x00, 0x10, 0x68,
                                    0x00, 0x00, 0x0b, 0xb8, 0x00, 0x00, 0x17, 0x70,
                                    0x00, 0x00, 0x1f, 0x40, 0x00, 0x00, 0x00, 0x7b,
                                    0x00, 0x00, 0x01, 0x00, 0x91, 0x00, 0x01, 0x00,
                                    0x01, 0x00, 0x01, 0x00, 0x02, 0x00, 0x01, 0x00,
                                    0x03, 0x00, 0x01, 0x00, 0x04, 0x00, 0x01, 0x00,
                                    0x05, 0x00, 0x01, 0x00, 0x06, 0x00, 0x01, 0x00,
                                    0x07, 0x00, 0x01, 0x00, 0x08, 0x00, 0x01, 0x00,
                                    0x09, 0x00, 0x01, 0x00, 0x0a, 0x00, 0x01, 0x00,
                                    0x0b, 0x00, 0x01, 0x00, 0x0c, 0x00, 0x01, 0x00,
                                    0x0d, 0x00, 0x01, 0x00, 0x0e, 0x00, 0x01, 0x00,
                                    0x0f, 0x00, 0x01, 0x00, 0x10, 0x00, 0x01, 0x00,
                                    0x11, 0x00, 0x01, 0x00, 0x12, 0x00, 0x01, 0x00,
                                    0x13, 0x00, 0x01, 0x00, 0x14, 0x00, 0x01, 0x00,
                                    0x15, 0x00, 0x01, 0x00, 0x16, 0x00, 0x01, 0x00,
                                    0x17, 0x00, 0x01, 0x00, 0x18, 0x00, 0x01, 0x00,
                                    0x19, 0x00, 0x01, 0x00, 0x1a, 0x00, 0x01, 0x00,
                                    0x1b, 0x00, 0x01, 0x00, 0x1c, 0x00, 0x01, 0x00,
                                    0x1d, 0x00, 0x01, 0x00, 0x1e, 0x00, 0x01, 0x00,
                                    0x1f, 0x00, 0x01, 0x00, 0x20, 0x00, 0x01, 0x00,
                                    0x21, 0x00, 0x02, 0x00, 0x01, 0x00, 0x02, 0x00,
                                    0x02, 0x00, 0x02, 0x00, 0x03, 0x00, 0x02, 0x00,
                                    0x04, 0x00, 0x02, 0x00, 0x06, 0x00, 0x02, 0x00,
                                    0x07, 0x00, 0x02, 0x00, 0x08, 0x00, 0x02, 0x00,
                                    0x0a, 0x00, 0x02, 0x00, 0x0c, 0x00, 0x02, 0x00,
                                    0x0d, 0x00, 0x02, 0x00, 0x0e, 0x00, 0x02, 0x00,
                                    0x0f, 0x00, 0x02, 0x00, 0x10, 0x00, 0x02, 0x00,
                                    0x11, 0x00, 0x02, 0x00, 0x12, 0x00, 0x02, 0x00,
                                    0x13, 0x00, 0x02, 0x00, 0x14, 0x00, 0x02, 0x00,
                                    0x15, 0x00, 0x03, 0x00, 0x01, 0x00, 0x03, 0x00,
                                    0x02, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00,
                                    0x06, 0x00, 0x03, 0x00, 0x07, 0x00, 0x03, 0x00,
                                    0x08, 0x00, 0x03, 0x00, 0x09, 0x00, 0x03, 0x00,
                                    0x0a, 0x00, 0x03, 0x00, 0x0b, 0x00, 0x03, 0x00,
                                    0x0c, 0x00, 0x04, 0x00, 0x01, 0x00, 0x04, 0x00,
                                    0x02, 0x00, 0x04, 0x00, 0x03, 0x00, 0x04, 0x00,
                                    0x04, 0x00, 0x04, 0x00, 0x05, 0x00, 0x04, 0x00,
                                    0x07, 0x00, 0x04, 0x00, 0x08, 0x00, 0x04, 0x00,
                                    0x09, 0x00, 0x04, 0x00, 0x0a, 0x00, 0x04, 0x00,
                                    0x0b, 0x00, 0x04, 0x00, 0x0c, 0x00, 0x04, 0x00,
                                    0x0d, 0x00, 0x04, 0x00, 0x0e, 0x00, 0x04, 0x00,
                                    0x0f, 0x00, 0x04, 0x00, 0x10, 0x00, 0x04, 0x00,
                                    0x11, 0x00, 0x04, 0x00, 0x12, 0x00, 0x04, 0x00,
                                    0x13, 0x00, 0x04, 0x00, 0x14, 0x00, 0x06, 0x00,
                                    0x01, 0x00, 0x06, 0x00, 0x02, 0x00, 0x06, 0x00,
                                    0x03, 0x00, 0x08, 0x00, 0x01, 0x00, 0x08, 0x00,
                                    0x02, 0x00, 0x09, 0x00, 0x01, 0x00, 0x09, 0x00,
                                    0x02, 0x00, 0x09, 0x00, 0x03, 0x00, 0x09, 0x00,
                                    0x04, 0x00, 0x09, 0x00, 0x09, 0x00, 0x09, 0x00,
                                    0x0a, 0x00, 0x09, 0x00, 0x0b, 0x00, 0x0a, 0x00,
                                    0x01, 0x00, 0x0a, 0x00, 0x02, 0x00, 0x0a, 0x00,
                                    0x03, 0x00, 0x0b, 0x00, 0x01, 0x00, 0x0b, 0x00,
                                    0x02, 0x00, 0x0b, 0x00, 0x03, 0x00, 0x0b, 0x00,
                                    0x04, 0x00, 0x0c, 0x00, 0x01, 0x00, 0x0c, 0x00,
                                    0x02, 0x00, 0x0c, 0x00, 0x03, 0x00, 0x13, 0x00,
                                    0x01, 0x00, 0x13, 0x00, 0x02, 0x00, 0x13, 0x00,
                                    0x03, 0x00, 0x13, 0x00, 0x04, 0x00, 0x13, 0x00,
                                    0x05, 0x00, 0x13, 0x00, 0x06, 0x00, 0x13, 0x00,
                                    0x07, 0x00, 0x13, 0x00, 0x08, 0x00, 0x13, 0x00,
                                    0x09, 0x00, 0x13, 0x00, 0x0a, 0x00, 0x13, 0x00,
                                    0x0b, 0x00, 0x13, 0x00, 0x0c, 0x00, 0x13, 0x00,
                                    0x0d, 0x00, 0x13, 0x00, 0x0e, 0x00, 0x13, 0x00,
                                    0x0f, 0x00, 0x13, 0x00, 0x10, 0x00, 0x13, 0x00,
                                    0x11, 0x00, 0x13, 0x00, 0x12, 0x00, 0x13, 0x00,
                                    0x13, 0x00, 0x13, 0x00, 0x14, 0x00, 0x13, 0x00,
                                    0x15, 0x00, 0x13, 0x00, 0x16, 0x00, 0x13, 0x00,
                                    0x17, 0x00, 0x13, 0x00, 0x18, 0x00, 0x13, 0x00,
                                    0x19, 0x00, 0x13, 0x00, 0x1a, 0x00, 0x13, 0x00,
                                    0x1b, 0x00, 0x13, 0x00, 0x1c, 0x00, 0x13, 0x00,
                                    0x1d, 0x00, 0x13, 0x00, 0x1e, 0x00, 0x13, 0x00,
                                    0x1f, 0x00, 0x13, 0x00, 0x20, 0x00, 0x13, 0x00,
                                    0x21, 0x00, 0x13, 0x00, 0x22, 0x00, 0x13, 0x00,
                                    0x23, 0x00, 0x13, 0x00, 0x24, 0x00, 0x13, 0x00,
                                    0x25, 0x00, 0x13, 0x00, 0x26, 0x00, 0x13, 0x00,
                                    0x27, 0x00, 0x13, 0x00, 0x28, 0x00, 0x15, 0x00,
                                    0x01, 0x00, 0x15, 0x00, 0x02, 0x00, 0x15, 0x00,
                                    0x03, 0x00, 0x02, 0x00, 0x06, 0x00, 0x03, 0x00,
                                    0x04, 0x00, 0x03, 0x00, 0x05, 0x00, 0x09, 0x00,
                                    0x05, 0x00, 0x09, 0x00, 0x06, 0x00, 0x09, 0x00,
                                    0x07, 0x00, 0x09, 0x00, 0x08, 0x00, 0x03, 0x00,
                                    0x02, 0x00, 0x02, 0x00, 0x05, 0x00, 0x04, 0x00,
                                    0x06, 0x00, 0x04, 0x00, 0x02, 0x00, 0x02, 0x00,
                                    0x09, 0x00, 0x02, 0x00, 0x0b, 0x00, 0x05, 0x00,
                                    0x00
                                ]));
                                return;
                            }
                            case 0x08: { // rate limits acceptance notification.
                                return;
                            }
                            case 0x0e: { // self information request.
                                SendData(session, 0, 2, new SNAC({
                                    foodGroup: 0x0001,
                                    type: 0x000f,
                                    flags: 0,
                                    requestId: 0,
                                    parameters: [
                                        new Parameter({ type: 0x01, data: [0, 0, 0, 0] }),
                                        new Parameter({ type: 0x06, data: [0, 0, 0, 0] }),
                                        new Parameter({ type: 0x0f, data: [0, 0, 0, 0] }),
                                        new Parameter({ type: 0x03, data: Util.Bit.UInt32ToBytes(Util.Dates.GetTimestamp()) }),
                                        new Parameter({ type: 0x0a, data: session.socket.remoteAddress.split('.').map(function(item) { return Util.Bit.UInt8ToBytes(item); }) }),
                                        new Parameter({ type: 0x1e, data: [0, 0, 0, 0] }),
                                        new Parameter({ type: 0x05, data: Util.Bit.UInt32ToBytes(session.user.CreationDate) }),
                                        new Parameter({ type: 0x0c, data: [0xae, 0x44, 0xbe, 0xa5, 0x00, 0x00, 0x16, 0x44, 0x04, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00] })
                                    ],
                                    extensions: {
                                        formattedScreenName: session.user.FormattedScreenName
                                    }
                                }).ToBytes());
                                return;
                            }
                            case 0x17: { // service host version request.
                                SendData(session, 0, 2, new SNAC({
                                    foodGroup: 0x0001,
                                    type: 0x0018,
                                    flags: 0,
                                    requestId: 0,
                                    extensions: {
                                        families: [
                                            new Family({ type: 1, version: 3 }),
                                            new Family({ type: 19, version: 3 }),
                                            new Family({ type: 24, version: 1 }),
                                            new Family({ type: 2, version: 1 }),
                                            new Family({ type: 3, version: 1 }),
                                            new Family({ type: 4, version: 1 }),
                                            new Family({ type: 6, version: 1 }),
                                            new Family({ type: 7, version: 1 }),
                                            new Family({ type: 8, version: 1 }),
                                            new Family({ type: 9, version: 1 }),
                                            new Family({ type: 10, version: 1 }),
                                            new Family({ type: 11, version: 1 }),
                                            new Family({ type: 15, version: 1 }),
                                            new Family({ type: 16, version: 1 })
                                        ]
                                    }
                                }).ToBytes());
                                return;
                            }
                            case 0x1e: { // set status request.
                                console.log('snac.parameters', snac.parameters);
                                return;
                            }
                        }
                        break;
                    }
                    case 0x0002: { // location services
                        switch (snac.type) {
                            case 0x02: { // location rights request.
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x0002,
                                    type: 0x0003,
                                    flags: 0,
                                    requestId: snac.requestId,
                                    parameters: [
                                        new Parameter({ type: 0x01, data: Util.Bit.UInt16ToBytes(1024) }),
                                        new Parameter({ type: 0x02, data: Util.Bit.UInt16ToBytes(18) }),
                                        new Parameter({ type: 0x05, data: Util.Bit.UInt16ToBytes(128) }),
                                        new Parameter({ type: 0x03, data: Util.Bit.UInt16ToBytes(10) }),
                                        new Parameter({ type: 0x04, data: Util.Bit.UInt16ToBytes(4096) })
                                    ]
                                }).ToBytes());
                                return;
                            }
                            case 0x04: { // user directory location information update request.
                                snac.parameters.forEach(function(item) {
                                    switch(item.type) {
                                        case 0x01:
                                            session.user.ProfileEncoding = item.data;
                                            break;
                                        case 0x02:
                                            session.user.Profile = item.data;
                                            break;
                                        case 0x03:
                                            session.user.AwayMessageEncoding = item.data;
                                            break;
                                        case 0x04:
                                            session.user.AwayMessage = item.data;
                                            break;
                                        case 0x05:
                                            session.user.Capabilities = item.data;
                                            break;
                                        case 0x06:
                                            session.user.Certs = item.data;
                                            break;
                                    }
                                });
                                await session.user.updateStatus(session, _sessions, SendData);
                                return;
                            }
                            case 0x09: { // directory update request.
                                // just ack. maybe we'll record directory later.
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x0002,
                                    type: 0x000a,
                                    flags: 0,
                                    requestId: snac.requestId
                                }).ToBytes().concat(
                                    Util.Bit.UInt16ToBytes(1)
                                ));
                                return;
                            }
                            case 0x0b: { // directory information request.
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x0002,
                                    type: 0x000c,
                                    flags: 0,
                                    requestId: snac.requestId
                                }).ToBytes().concat(
                                    Util.Bit.UInt16ToBytes(1),
                                    Util.Bit.UInt16ToBytes(0)
                                ));
                                return;
                            }
                            case 0x0f: { // directory update interests request.
                                // just ack. maybe we'll record directory interests later.
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x0002,
                                    type: 0x000f,
                                    flags: 0,
                                    requestId: snac.requestId
                                }).ToBytes().concat(
                                    Util.Bit.UInt16ToBytes(1)
                                ));
                                return;
                            }
                            case 0x15: { // locate directory info request.
                                let userInfo = _sessions.item({ screenName: Util.Strings.TrimData(Util.Bit.BytesToString(snac.screenName)) });
                                if (userInfo) {
                                    let flagParameters = [
                                        new Parameter({ type: 0x01, data: Util.Bit.UInt32ToBytes(Util.Bit.UserClass(userInfo.user.Class, userInfo.user.AwayMessage && userInfo.user.AwayMessage.length ? true : false)) }),
                                        new Parameter({ type: 0x0f, data: Util.Bit.UInt32ToBytes((Util.Dates.GetTimestamp() - userInfo.user.SignedOnTimestamp)) }),
                                        new Parameter({ type: 0x03, data: Util.Bit.UInt32ToBytes(userInfo.user.SignedOnTimestamp) })
                                    ];
                                    if (Util.Bit.BytesToUInt32(snac.requestFlags) & 0x01 && userInfo.user.Profile)
                                    {
                                        flagParameters.push(new Parameter({ type: 0x01, data: userInfo.user.ProfileEncoding }));
                                        flagParameters.push(new Parameter({ type: 0x02, data: userInfo.user.Profile }));
                                    }
                                    if (Util.Bit.BytesToUInt32(snac.requestFlags) & 0x02 && (userInfo.user.AwayMessage && userInfo.user.AwayMessage.length))
                                    {
                                        flagParameters.push(new Parameter({ type: 0x03, data: userInfo.user.AwayMessageEncoding }));
                                        flagParameters.push(new Parameter({ type: 0x04, data: userInfo.user.AwayMessage }));
                                    }
                                    if (Util.Bit.BytesToUInt32(snac.requestFlags) & 0x04 && userInfo.user.Capabilities)
                                    {
                                        flagParameters.push(new Parameter({ type: 0x05, data: userInfo.user.Capabilities }));
                                    }
                                    SendData(session, snac.requestId, 2, new SNAC({
                                        foodGroup: 0x02,
                                        type: 0x06,
                                        flags: 0,
                                        requestId: snac.requestId,
                                        extensions: {
                                            formattedScreenName: userInfo.user.FormattedScreenName
                                        },
                                        parameters: flagParameters
                                    }).ToBytes());
                                    return;
                                }
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x02,
                                    type: 0x01,
                                    flags: 0,
                                    requestId: snac.requestId
                                }).ToBytes().concat(Util.Bit.UInt16ToBytes(4)));
                                return;
                            }
                        }
                        break;
                    }
                    case 0x0003: { // buddy list management service
                        switch (snac.type) {
                            case 0x02: // buddy rights request.
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x0003,
                                    type: 0x0003,
                                    flags: 0,
                                    requestId: snac.requestId,
                                    parameters: [
                                        new Parameter({ type: 0x02, data: Util.Bit.UInt16ToBytes(2000) }),
                                        new Parameter({ type: 0x01, data: Util.Bit.UInt16ToBytes(220) }),
                                        new Parameter({ type: 0x04, data: Util.Bit.UInt16ToBytes(32) }),
                                    ]
                                }).ToBytes());
                                return;
                        }
                        break;
                    }
                    case 0x0004: { // icbm service
                        switch (snac.type) {
                            case 0x02: { // update icbm params request.
                                return;
                            }
                            case 0x04: { // request icbm parameters.
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x0004,
                                    type: 0x0005,
                                    flags: 0,
                                    requestId: snac.requestId
                                }).ToBytes().concat(
                                    Util.Bit.UInt16ToBytes(2),
                                    Util.Bit.UInt32ToBytes(3),
                                    Util.Bit.UInt16ToBytes(512),
                                    Util.Bit.UInt16ToBytes(999),
                                    Util.Bit.UInt16ToBytes(999),
                                    Util.Bit.UInt16ToBytes(0),
                                    Util.Bit.UInt16ToBytes(1000),
                                ));
                                return; 
                            }
                            case 0x06: { // incoming icbm
                                let existingSession = _sessions.item({ screenName: Util.Bit.BytesToString(snac.screenName) });
                                if (existingSession) {
                                    let ack = snac.parameters.find(function(item) { return item.type === 0x03 });
                                    if (ack) {
                                        SendData(session, snac.requestId, 2, new SNAC({
                                            foodGroup: 0x04,
                                            type: 0x0c,
                                            flags: 0,
                                            requestId: snac.requestId
                                        }).ToBytes().concat(
                                            snac.cookie,
                                            snac.channel,
                                            Util.Bit.UInt8ToBytes(existingSession.user.FormattedScreenName.length),
                                            Util.Bit.BufferBytes(existingSession.user.FormattedScreenName)
                                        ));
                                    }
                                    let frags = snac.parameters.map(function(item) { return item.data.filter(function(i) { return i instanceof Fragment; }).map(function(i) { return i.ToBytes(); }).flat(); }).flat();
                                    SendData(existingSession, 0, 2, new SNAC({
                                        foodGroup: 0x04,
                                        type: 0x07,
                                        flags: 0,
                                        requestId: 0,
                                        extensions: {
                                            cookie: Util.Bit.BytesToString(snac.cookie),
                                            channel: Util.Bit.BytesToUInt16(snac.channel),
                                            formattedScreenName: session.user.FormattedScreenName,
                                            warningLevel: 0
                                        },
                                        parameters: [
                                            Util.Bit.BytesToUInt16(snac.channel) == 1 ? new Parameter({ type: 0x02, data: frags }) : Util.Bit.BytesToUInt16(snac.channel) == 2 ? new Parameter({ type: 0x05, data: snac.parameters.find(function(item) { return item.type === 0x05 }).data }): []
                                        ]
                                    }).ToBytes());
                                    return;
                                }
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x04,
                                    type: 0x01,
                                    flags: 0,
                                    requestId: snac.requestId,
                                    extensions: {
                                        errorId: 4
                                    }
                                }).ToBytes());
                                return;
                            }
                        }
                        break;
                    }
                    case 0x0005: { // advertisement service
                        return;
                    }
                    case 0x0006: { // invitation service
                        break;
                    }
                    case 0x0007: { // administrative service
                        switch (snac.type) {
                            case 0x02: { // admin information request.
                                if (snac.parameters.find(function(item) { return item.type === 0x01; })) {
                                    SendData(session, snac.requestId, 2, new SNAC({
                                        foodGroup: 0x07,
                                        type: 0x03,
                                        flags: 0,
                                        requestId: snac.requestId,
                                        parameters: [
                                            new Parameter({ type: 0x01, data: Util.Bit.BufferBytes(session.user.FormattedScreenName) })
                                        ],
                                        extensions: {
                                            permissions: 3
                                        }
                                    }).ToBytes());
                                }
                                if (snac.parameters.find(function(item) { return item.type === 0x11; })) {
                                    SendData(session, snac.requestId, 2, new SNAC({
                                        foodGroup: 0x07,
                                        type: 0x03,
                                        flags: 0,
                                        requestId: snac.requestId,
                                        parameters: [
                                            new Parameter({ type: 0x11, data: Util.Bit.BufferBytes(session.user.EmailAddress) })
                                        ],
                                        extensions: {
                                            permissions: 3
                                        }
                                    }).ToBytes());
                                }
                                if (snac.parameters.find(function(item) { return item.type === 0x13; })) {
                                    SendData(session, snac.requestId, 2, new SNAC({
                                        foodGroup: 0x07,
                                        type: 0x03,
                                        flags: 0,
                                        requestId: snac.requestId,
                                        parameters: [
                                            new Parameter({ type: 0x13, data: Util.Bit.UInt16ToBytes(3) })
                                        ]
                                    }).ToBytes());
                                }
                                return;
                            }
                            case 0x04: { // admin information update request.
                                let _buffer = [];
                                if (snac.parameters.find(function(item) { return item.type === 0x01 })) {
                                    let parameter = snac.parameters.find(function(item) { return item.type === 0x01 }).data;
                                    if (Util.Strings.TrimData(Util.Bit.BytesToString(parameter)) === session.user.ScreenName && parameter.length <= 18){
                                        session.user.FormattedScreenName = Util.Bit.BytesToString(parameter).trim();
                                        _buffer.push(
                                            Util.Bit.UInt16ToBytes(0x03).concat(
                                                Util.Bit.UInt16ToBytes(0x01),
                                                new Parameter({ type: 0x01, data: Util.Bit.BufferBytes(Util.Bit.BytesToString(parameter).trim()) }).ToBytes()
                                            )
                                        );
                                        await session.user.updateStatus(session, _sessions, SendData);
                                    } else {
                                        _buffer.push(
                                            Util.Bit.UInt16ToBytes(0x03).concat(
                                                Util.Bit.UInt16ToBytes(0x03),
                                                new Parameter({ type: 0x01, data: [] }).ToBytes(),
                                                new Parameter({ type: 0x04, data: Util.Bit.BufferBytes('https://www.lwrca.se/owaim/') }).ToBytes(),
                                                new Parameter({ type: 0x08, data: Util.Bit.UInt16ToBytes(0x0b) }).ToBytes()
                                            )
                                        );
                                    }
                                }
                                if (snac.parameters.find(function(item) { return item.type === 0x11 })) {
                                    let parameter = snac.parameters.find(function(item) { return item.type === 0x11 }).data;
                                    if (Util.Bit.BytesToString(parameter).indexOf('@') > -1 && Util.Bit.BytesToString(parameter).indexOf('.') > -1) {
                                        session.user.EmailAddress = Util.Bit.BytesToString(parameter).trim();
                                        _buffer.push(
                                            Util.Bit.UInt16ToBytes(0x03).concat(
                                                Util.Bit.UInt16ToBytes(0x01),
                                                new Parameter({ type: 0x11, data: Util.Bit.BufferBytes(Util.Bit.BytesToString(parameter).trim()) }).ToBytes()
                                            )
                                        );
                                    } else {
                                        _buffer.push(
                                            Util.Bit.UInt16ToBytes(0x03).concat(
                                                Util.Bit.UInt16ToBytes(0x03),
                                                new Parameter({ type: 0x11, data: [] }).ToBytes(),
                                                new Parameter({ type: 0x04, data: Util.Bit.BufferBytes('https://www.lwrca.se/owaim/') }).ToBytes(),
                                                new Parameter({ type: 0x08, data: Util.Bit.UInt16ToBytes(0x0b) }).ToBytes()
                                            )
                                        );
                                    }
                                }
                                if (snac.parameters.find(function(item) { return item.type === 0x13 })) {
                                    _buffer.push(
                                        Util.Bit.UInt16ToBytes(0x01).concat(
                                            Util.Bit.UInt16ToBytes(0x03),
                                            new Parameter({ type: 0x13, data: [] }).ToBytes(),
                                            new Parameter({ type: 0x04, data: Util.Bit.BufferBytes('https://www.lwrca.se/owaim/') }).ToBytes(),
                                            new Parameter({ type: 0x08, data: Util.Bit.UInt16ToBytes(0x10) }).ToBytes()
                                        )
                                    );
                                }
                                await session.user.updateAdminInfo();
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x0007,
                                    type: 0x0005,
                                    flags: 0,
                                    requestId: snac.requestId
                                }).ToBytes().concat(_buffer.flat()));
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x0001,
                                    type: 0x000f,
                                    flags: 0,
                                    requestId: snac.requestId,
                                    parameters: [
                                        new Parameter({ type: 0x01, data: [0, 0, 0, 0] }),
                                        new Parameter({ type: 0x06, data: [0, 0, 0, 0] }),
                                        new Parameter({ type: 0x0f, data: [0, 0, 0, 0] }),
                                        new Parameter({ type: 0x03, data: Util.Bit.UInt32ToBytes(Util.Dates.GetTimestamp()) }),
                                        new Parameter({ type: 0x0a, data: session.socket.remoteAddress.split('.').map(function(item) { return Util.Bit.UInt8ToBytes(item); }) }),
                                        new Parameter({ type: 0x1e, data: [0, 0, 0, 0] }),
                                        new Parameter({ type: 0x05, data: Util.Bit.UInt32ToBytes(session.user.CreationDate) }),
                                        new Parameter({ type: 0x0c, data: [0xae, 0x44, 0xbe, 0xa5, 0x00, 0x00, 0x16, 0x44, 0x04, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00] })
                                    ],
                                    extensions: {
                                        formattedScreenName: session.user.FormattedScreenName
                                    }
                                }).ToBytes());
                                return;
                            }
                        }
                        break;
                    }
                    case 0x0008: { // popup notices service
                        return;
                    }
                    case 0x0009: { // privacy management service
                        switch (snac.type) {
                            case 0x02: { // privacy rights request.
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x0009,
                                    type: 0x0003,
                                    flags: 0,
                                    requestId: snac.requestId,
                                    parameters: [
                                        new Parameter({ type: 0x02, data: Util.Bit.UInt16ToBytes(220) }),
                                        new Parameter({ type: 0x01, data: Util.Bit.UInt16ToBytes(220) }),
                                    ]
                                }).ToBytes());
                                return; 
                            }     
                        }
                        break;
                    }
                    case 0x000a: { // user lookup service
                        return;
                    }
                    case 0x000b: { // usage stats service
                        return;
                    }
                    case 0x000c: { // translation service
                        return;
                    }
                    case 0x000f: { // directory user search
                        return;
                    }
                    case 0x0010: { // server-stored buddy icons service
                        return;
                    }
                    case 0x0013: { // server side information service
                        switch (snac.type) {
                            case 0x02: { // feedbag rights request.
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x0013,
                                    type: 0x0003,
                                    flags: 0,
                                    requestId: snac.requestId,
                                    parameters: [
                                        new Parameter({ type: 0x04, data: [0x01, 0x90, 0x00, 0x3d, 0x00, 0xc8, 0x00, 0xc8, 0x00, 0x01, 0x00, 0x01, 0x00, 0x96, 0x00, 0x0c, 0x00, 0x0c, 0x00, 0x00, 0x00, 0x32, 0x00, 0x32, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0f, 0x00, 0x01, 0x00, 0x28, 0x00, 0x01, 0x00, 0x0a, 0x00, 0xc8] }),
                                        new Parameter({ type: 0x02, data: [0x00, 0xfe] }),
                                        new Parameter({ type: 0x03, data: [0x01, 0xfc] }),
                                        new Parameter({ type: 0x05, data: [0x00, 0x64] }),
                                        new Parameter({ type: 0x06, data: [0x00, 0x61] }),
                                        new Parameter({ type: 0x07, data: [0x00, 0xc8] }),
                                        new Parameter({ type: 0x08, data: [0x00, 0x0a] }),
                                        new Parameter({ type: 0x09, data: [0x00, 0x06, 0x0f, 0x22] }),
                                        new Parameter({ type: 0x0a, data: [0x00, 0x06, 0x0f, 0x0e] })
                                    ]
                                }).ToBytes());
                                return;
                            }
                            case 0x04: { // feedbag request.
                                let buddyList = await session.user.getFeedbagBuddyList();
                                let timeStamp = await session.user.getFeedbagTimestamp();
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x0013,
                                    type: 0x0006,
                                    flags: 0,
                                    requestId: snac.requestId
                                }).ToBytes().concat(
                                    Util.Bit.UInt8ToBytes(0),
                                    Util.Bit.UInt16ToBytes(buddyList.length),
                                    buddyList.map(function(item) { 
                                        return new SSI({ name: item.Name, groupId: item.GroupID, itemId: item.BuddyID, classId: item.ClassID, attributes: item.Attributes }).ToBytes()
                                    }).flat(),
                                    Util.Bit.UInt32ToBytes(timeStamp)
                                ));
                                return;
                            }
                            case 0x05: { // feedbag request if modified.
                                let date = Util.Bit.BytesToUInt32(snac.date);
                                let count = Util.Bit.BytesToUInt16(snac.count);
                                let buddyList = await session.user.getFeedbagBuddyList();
                                let timeStamp = await session.user.getFeedbagTimestamp();
                                if (timeStamp != date && buddyList.length != count) {
                                    SendData(session, snac.requestId, 2, new SNAC({
                                        foodGroup: 0x0013,
                                        type: 0x0006,
                                        flags: 0,
                                        requestId: snac.requestId
                                    }).ToBytes().concat(
                                        Util.Bit.UInt8ToBytes(0),
                                        Util.Bit.UInt16ToBytes(buddyList.length),
                                        buddyList.map(function(item) { 
                                            return new SSI({ name: item.Name, groupId: item.GroupID, itemId: item.BuddyID, classId: item.ClassID, attributes: item.Attributes }).ToBytes()
                                        }).flat(),
                                        Util.Bit.UInt32ToBytes(timeStamp),
                                        Util.Bit.UInt32ToBytes(date + 2588)
                                    ));
                                } else {
                                    SendData(session, snac.requestId, 2, new SNAC({
                                        foodGroup: 0x0013,
                                        type: 0x000f,
                                        flags: 0,
                                        requestId: snac.requestId
                                    }).ToBytes().concat(
                                        snac.date,
                                        snac.count
                                    ));
                                }
                                return;
                            }
                            case 0x07: { // feedbag in use.
                                return; 
                            }
                            case 0x08: { // feedbag add request.
                                var _buffer = [];
                                if (snac.items) {
                                    for (let item of snac.items) {
                                        let b = await session.user.addFeedbagItem(item.name, item.groupId, item.itemId, item.classId, item.attributes);
                                        _buffer.push(b ? Util.Bit.BufferBytes([0x00, 0x00]) : Util.Bit.BufferBytes([0x00, 0x0a]));
                                    }
                                }
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x13,
                                    type: 0x0e,
                                    flags: 32768,
                                    requestId: snac.requestId
                                }).ToBytes().concat(
                                    _buffer.flat()
                                ));
                                return;
                            }
                            case 0x09: { // feedbag update request.
                                var _buffer = [];
                                if (snac.items) {
                                    for (let item of snac.items) {
                                        let b = await session.user.updateFeedbagItem(item.name, item.groupId, item.itemId, item.classId, item.attributes);
                                        _buffer.push(b ? Util.Bit.BufferBytes([0x00, 0x00]) : Util.Bit.BufferBytes([0x00, 0x0a]));
                                    }
                                }
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x13,
                                    type: 0x0e,
                                    flags: 32768,
                                    requestId: snac.requestId
                                }).ToBytes().concat(
                                    _buffer.flat()
                                ));
                                return;
                            }
                            case 0x0a: { // feedbag delete request.
                                var _buffer = [];
                                if (snac.items) {
                                    for (let item of snac.items) {
                                        let b = await session.user.deleteFeedbagItem(item.name, item.groupId, item.itemId, item.classId, item.attributes);
                                        _buffer.push(b ? Util.Bit.BufferBytes([0x00, 0x00]) : Util.Bit.BufferBytes([0x00, 0x0a]));
                                    }
                                }
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x13,
                                    type: 0x0e,
                                    flags: 32768,
                                    requestId: snac.requestId
                                }).ToBytes().concat(
                                    _buffer.flat()
                                ));
                                return;
                            }
                            case 0x12: {
                                await session.user.updateFeedbagMeta();
                                await session.user.updateStatus(session, _sessions, SendData);
                            }
                        }
                        break;
                    }
                    case 0x0015: { // ICQ specific extensions service
                        return;
                    }
                    case 0x0017: { // authorization/registration service
                        return;
                    }
                    case 0x0018: { // email
                        return;
                    }
                }
                // All other SNACs
                console.log('BOS unhandled', snac)
                return;
            }
            case 4: { // disconnect
                return;
            }
        }
    }
});
bosServer.listen(_options.bosPort, _options.ip).on('listening', function () { console.log('BOS socket listening on', bosServer.address()); }).on('error', function (err) { console.log('BOS server socket error:', err); });

let aosServer = Net.createServer(function (socket) {
    let session = { sequence: 0, socket: socket, buffer: [] };
    session.socket.on('error', function (err) {
        console.log('<!> AOS server socket error:', err);
    });
    session.socket.on('end', function () {
        delete session.socket;
        delete session.sequence;
        if (session.chat) {
            // remove user from users list.
            session.chat.users.splice(session.chat.users.indexOf(session.parent.user.ScreenName), 1);
            // remove session from chat.
            session.chat.sessions.splice(session.chat.sessions.indexOf(session), 1);
            // send leave.
            session.chat.sessions.forEach(function(item) {
                SendData(item, 0, 2, new SNAC({
                    foodGroup: 0x000e,
                    type: 0x0004,
                    flags: 0,
                    requestId: 0,
                    parameters: [
                        new Parameter({ type: 0x01, data: Util.Bit.UInt32ToBytes(0x0000) }),
                        new Parameter({ type: 0x0f, data: Util.Bit.UInt32ToBytes(0x0000) }),
                        new Parameter({ type: 0x03, data: Util.Bit.UInt32ToBytes(0x0000)})
                    ],
                    extensions: {
                        formattedScreenName: session.parent.user.FormattedScreenName,
                        warningLevel: 0
                    }
                }).ToBytes());
            });
        }
        // remove from services.
        if (session.parent) {
            session.parent.services.splice(session.parent.services.indexOf(session), 1);
        }
        // remove from sessions.
        _sessions.remove(session);
        delete session;
    });
    session.socket.on('data', async function (data) {
        var _bytes = Util.Bit.BufferBytes(data);
        session.buffer = session.buffer.concat(_bytes);
        var endProcStream = false;
        if (session.buffer.length < 10) { return; }
        while (session.buffer.length > 0 & !endProcStream) {
            if (session.buffer.slice(0, 1)[0] !== 0x2a) {
                console.log('<!> non FLAP packet recieved on BOS socket!');
                return;
            }
            var size = Util.Bit.BytesToUInt16(session.buffer.slice(4, 6));
            if (session.buffer.length >= (6 + size)) {
                await ProcessRequest(session, session.buffer.slice(0, 6), session.buffer.slice(6, 6 + size), session.buffer.splice(0, 6 + size));
            } else {
                endProcStream = true;
            }
        }
    });
    SendData(session, 0, 1, Util.Constants._FLAP_VERSION);
    async function ProcessRequest(session, header, data, bytes) {
        // get FLAP header.
        let flap = new FLAP(header);

        switch(flap.channel) {
            case 1: { // auth
                if (data.length > 4) {
                    let parameters = Parameter.GetParameters(0, 0, data.slice(4));
                    let cookie = parameters.find(function (item) { return item.type === 0x06; });
                    if (cookie) {
                        let existingSession = _sessions.item({ serviceCookie: Util.Bit.BytesToString(cookie.data) });
                        if (existingSession) {
                            let serviceSession = existingSession.services.find(function(item) { return item.cookie === Util.Bit.BytesToString(cookie.data) });
                            if (serviceSession) {
                                session.parent = existingSession;
                                _sessions.reconcile(serviceSession, session);
                                SendData(session, 0, 2, new SNAC({
                                    foodGroup: 0x0001,
                                    type: 0x0003,
                                    flags: 0,
                                    requestId: 0,
                                    extensions: {
                                        families: [1, 13, 14, 15, 16]
                                    }
                                }).ToBytes());
                                return;
                            }
                            SendData(session, 0, 4, []);
                            return;
                        }
                        SendData(session, 0, 4, []);
                        return;
                    }
                    SendData(session, 0, 4, []);
                    return;
                }
                SendData(session, 0, 4, []);
                return;
            }
            case 2: { // snac
                // get SNAC packet
                let snac = new SNAC(data);

                switch (snac.foodGroup) {
                    case 0x0001: // generic service controls
                        switch(snac.type) {
                            case 0x02: // client service ready
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x000d,
                                    type: 0x0009,
                                    flags: 0,
                                    requestId: snac.requestId
                                }).ToBytes().concat(
                                   [0x00, 0x02, 0x00, 0x01, 0x11, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x02, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x27, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x07, 0xd0, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x04, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x27, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x04, 0x00, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x05, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x44, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x02, 0x00, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x27, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x02, 0x00, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x06, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x44, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x02, 0x00, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x27, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x02, 0x00, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x07, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x40, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x44, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x1a, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x08, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x32, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x09, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x32, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x0a, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x32, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x0b, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x32, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x0c, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x32, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x0d, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x32, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x0e, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x32, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x0f, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x32, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x10, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x32, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x14, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x40, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x44, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x1a, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8] 
                                ));
                                if (session.groupId === 0x0e) {
                                    session.chatCookie = session.cookie.split('.')[0];
                                    let chats = _chatrooms.findNonExistantSession(session.parent.user.ScreenName, session.chatCookie);
                                    if (chats && chats.length > 0) {
                                        let chat = chats[0];
                                        session.chat = chat;
                                        chat.sessions.forEach(function(item) {
                                            SendData(session, 0, 2, new SNAC({
                                                foodGroup: 0x000e,
                                                type: 0x0003,
                                                flags: 0,
                                                requestId: 0,
                                                parameters: [
                                                    new Parameter({ type: 0x01, data: Util.Bit.UInt32ToBytes(0x0000) }),
                                                    new Parameter({ type: 0x0f, data: Util.Bit.UInt32ToBytes(0x0000) }),
                                                    new Parameter({ type: 0x03, data: Util.Bit.UInt32ToBytes(0x0000) })
                                                ],
                                                extensions: {
                                                    formattedScreenName: item.parent.user.FormattedScreenName,
                                                    warningLevel: 0
                                                }
                                            }).ToBytes());
                                        });
                                        chat.sessions.push(session);
                                        chat.sessions.forEach(function(item) {
                                            SendData(item, 0, 2, new SNAC({
                                                foodGroup: 0x000e,
                                                type: 0x0003,
                                                flags: 0,
                                                requestId: 0,
                                                parameters: [
                                                    new Parameter({ type: 0x01, data: Util.Bit.UInt32ToBytes(0x0000) }),
                                                    new Parameter({ type: 0x0f, data: Util.Bit.UInt32ToBytes(0x0000) }),
                                                    new Parameter({ type: 0x03, data: Util.Bit.UInt32ToBytes(0x0000) })
                                                ],
                                                extensions: {
                                                    formattedScreenName: session.parent.user.FormattedScreenName,
                                                    warningLevel: 0
                                                }
                                            }).ToBytes());
                                        });
                                    }
                                }
                                return;
                            case 0x06: // rate limits request.
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x0001,
                                    type: 0x0007,
                                    flags: 0,
                                    requestId: snac.requestId
                                }).ToBytes().concat(
                                    Util.Bit.UInt16ToBytes(0)
                                ));
                                return;
                            case 0x17: // service host version request.
                                SendData(session, 0, 2, new SNAC({
                                    foodGroup: 0x0001,
                                    type: 0x0018,
                                    flags: 0,
                                    requestId: 0,
                                    extensions: {
                                        families: [
                                            new Family({ type: 1, version: 4 }),
                                            new Family({ type: 2, version: 1 }),
                                            new Family({ type: 3, version: 1 }),
                                            new Family({ type: 4, version: 1 }),
                                            new Family({ type: 6, version: 1 }),
                                            new Family({ type: 8, version: 1 }),
                                            new Family({ type: 9, version: 1 }),
                                            new Family({ type: 10, version: 1 }),
                                            new Family({ type: 11, version: 1 }),
                                            new Family({ type: 12, version: 1 }),
                                            new Family({ type: 14, version: 1 }),
                                            new Family({ type: 13, version: 1 }),
                                            new Family({ type: 19, version: 5 }),
                                            new Family({ type: 21, version: 2 }),
                                            new Family({ type: 34, version: 1 }),
                                            new Family({ type: 34, version: 1 }),
                                            new Family({ type: 37, version: 1 })
                                        ]
                                    }
                                }).ToBytes());
                                return;
                        }
                        break;
                    case 0x000d: // chat navigation service
                        switch(snac.type) {
                            case 0x02: { // chatnav rights request.
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x000d,
                                    type: 0x0009,
                                    flags: 0,
                                    requestId: snac.requestId
                                }).ToBytes().concat(
                                   [0x00, 0x02, 0x00, 0x01, 0x11, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x02, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x27, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x07, 0xd0, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x04, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x27, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x04, 0x00, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x05, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x44, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x02, 0x00, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x27, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x02, 0x00, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x06, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x44, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x02, 0x00, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x27, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x02, 0x00, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x07, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x40, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x44, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x1a, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x08, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x32, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x09, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x32, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x0a, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x32, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x0b, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x32, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x0c, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x32, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x0d, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x32, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x0e, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x32, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x0f, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x32, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x10, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x1e, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x40, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x32, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8, 0x00, 0x03, 0x00, 
                                    0x3c, 0x00, 0x14, 0x00, 0x0a, 0x00, 0x03, 0x00, 
                                    0x01, 0x16, 0x00, 0x04, 0x00, 0x02, 0x40, 0x00, 
                                    0x00, 0xc9, 0x00, 0x02, 0x00, 0x44, 0x00, 0xca, 
                                    0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 
                                    0x00, 0x00, 0x00, 0xd1, 0x00, 0x02, 0x07, 0xd0, 
                                    0x00, 0xd2, 0x00, 0x02, 0x00, 0x1a, 0x00, 0xd4, 
                                    0x00, 0x00, 0x00, 0xd5, 0x00, 0x01, 0x01, 0x00, 
                                    0xda, 0x00, 0x02, 0x00, 0xe8] 
                                ));
                                return;
                            }
                            case 0x04: {
                                let existingChat = _chatrooms.item({ cookie: Util.Bit.BytesToString(snac.cookie) });
                                if (existingChat) {
                                    existingChat.users.push(session.parent.user.ScreenName);
                                    SendData(session, snac.requestId, 2, new SNAC({
                                        foodGroup: 0x0d,
                                        type: 0x09,
                                        flags: 0,
                                        requestId: snac.requestId,
                                        parameters: [
                                            new Parameter({ type: 0x02, data: Util.Bit.UInt8ToBytes(10) }),
                                            new Parameter({ type: 0x04, data: Util.Bit.UInt16ToBytes(existingChat.exchange).concat(
                                                Util.Bit.UInt8ToBytes(existingChat.cookie.length),
                                                Util.Bit.BufferBytes(existingChat.cookie),
                                                Util.Bit.UInt16ToBytes(0),
                                                Util.Bit.UInt8ToBytes(2),
                                                Util.Bit.UInt16ToBytes(10),
                                                [
                                                    new Parameter({ type: 0xd0, data: Util.Bit.UInt16ToBytes(3) }).ToBytes(),
                                                    new Parameter({ type: 0xd1, data: Util.Bit.UInt16ToBytes(1024) }).ToBytes(),
                                                    new Parameter({ type: 0xd2, data: Util.Bit.UInt16ToBytes(66) }).ToBytes(),
                                                    new Parameter({ type: 0xd3, data: Util.Bit.BufferBytes(existingChat.name) }).ToBytes(),
                                                    new Parameter({ type: 0xd5, data: Util.Bit.UInt8ToBytes(1) }).ToBytes(),
                                                    new Parameter({ type: 0xcb, data: Util.Bit.BufferBytes(existingChat.creator) }).ToBytes(),
                                                    new Parameter({ type: 0x03, data: Util.Bit.UInt8ToBytes(10) }).ToBytes(),
                                                    new Parameter({ type: 0x04, data: Util.Bit.UInt8ToBytes(20) }).ToBytes(),
                                                    new Parameter({ type: 0x02, data: Util.Bit.UInt16ToBytes(0) }).ToBytes(),
                                                    new Parameter({ type: 0x05, data: Util.Bit.UInt16ToBytes(existingChat.exchange).concat(
                                                        Util.Bit.UInt8ToBytes(existingChat.cookie.length),
                                                        Util.Bit.BufferBytes(existingChat.cookie),
                                                        Util.Bit.UInt16ToBytes(0)
                                                    )}).ToBytes()
                                                ].flat()
                                            )})
                                        ]
                                    }).ToBytes());
                                    return;
                                }
                                return;
                            }
                            case 0x08: { // create/join chat.
                                let chatRoomName = snac.parameters.find(function(item) { return item.type === 0xd3; });
                                let chatCharset = snac.parameters.find(function(item) { return item.type === 0xd6; });
                                let chatLang = snac.parameters.find(function(item) { return item.type === 0xd7; });
                                let existingChat = _chatrooms.item({ name: Util.Bit.BytesToString(chatRoomName.data) });
                                if (existingChat) {
                                    existingChat.users.push(session.parent.user.ScreenName);
                                    SendData(session, snac.requestId, 2, new SNAC({
                                        foodGroup: 0x0d,
                                        type: 0x09,
                                        flags: 0,
                                        requestId: snac.requestId,
                                        parameters: [
                                            new Parameter({ type: 0x02, data: Util.Bit.UInt8ToBytes(10) }),
                                            new Parameter({ type: 0x04, data: Util.Bit.UInt16ToBytes(existingChat.exchange).concat(
                                                Util.Bit.UInt8ToBytes(existingChat.cookie.length),
                                                Util.Bit.BufferBytes(existingChat.cookie),
                                                Util.Bit.UInt16ToBytes(0),
                                                Util.Bit.UInt8ToBytes(2),
                                                Util.Bit.UInt16ToBytes(10),
                                                [
                                                    new Parameter({ type: 0xd0, data: Util.Bit.UInt16ToBytes(3) }).ToBytes(),
                                                    new Parameter({ type: 0xd1, data: Util.Bit.UInt16ToBytes(1024) }).ToBytes(),
                                                    new Parameter({ type: 0xd2, data: Util.Bit.UInt16ToBytes(66) }).ToBytes(),
                                                    new Parameter({ type: 0xd3, data: Util.Bit.BufferBytes(existingChat.name) }).ToBytes(),
                                                    new Parameter({ type: 0xd5, data: Util.Bit.UInt8ToBytes(1) }).ToBytes(),
                                                    new Parameter({ type: 0xcb, data: Util.Bit.BufferBytes(existingChat.creator) }).ToBytes(),
                                                    new Parameter({ type: 0x03, data: Util.Bit.UInt8ToBytes(10) }).ToBytes(),
                                                    new Parameter({ type: 0x04, data: Util.Bit.UInt8ToBytes(20) }).ToBytes(),
                                                    new Parameter({ type: 0x02, data: Util.Bit.UInt16ToBytes(0) }).ToBytes(),
                                                    new Parameter({ type: 0x05, data: Util.Bit.UInt16ToBytes(existingChat.exchange).concat(
                                                        Util.Bit.UInt8ToBytes(existingChat.cookie.length),
                                                        Util.Bit.BufferBytes(existingChat.cookie),
                                                        Util.Bit.UInt16ToBytes(0)
                                                    )}).ToBytes()
                                                ].flat()
                                            )})
                                        ]
                                    }).ToBytes());
                                    return;
                                } else {
                                    let newRoom = _chatrooms.add({
                                        exchange: Util.Bit.BytesToUInt16(snac.exchange),
                                        cookie: Util.Bit.BytesToString(snac.cookie) === 'create' ? Util.Strings.GenerateChatCookie() : Util.Bit.BytesToString(snac.cookie),
                                        detailLevel: snac.detailLevel,
                                        creator: session.parent.user.ScreenName,
                                        name: Util.Bit.BytesToString(chatRoomName.data),
                                        charset: Util.Bit.BytesToString(chatCharset.data),
                                        lang: Util.Bit.BytesToString(chatLang.data)
                                    });
                                    newRoom.users.push(session.parent.user.ScreenName);
                                    SendData(session, snac.requestId, 2, new SNAC({
                                        foodGroup: 0x0d,
                                        type: 0x09,
                                        flags: 0,
                                        requestId: snac.requestId,
                                        parameters: [
                                            new Parameter({ type: 0x02, data: Util.Bit.UInt8ToBytes(10) }),
                                            new Parameter({ type: 0x04, data: Util.Bit.UInt16ToBytes(newRoom.exchange).concat(
                                                Util.Bit.UInt8ToBytes(newRoom.cookie.length),
                                                Util.Bit.BufferBytes(newRoom.cookie),
                                                Util.Bit.UInt16ToBytes(0),
                                                Util.Bit.UInt8ToBytes(2),
                                                Util.Bit.UInt16ToBytes(10),
                                                [
                                                    new Parameter({ type: 0xd0, data: Util.Bit.UInt16ToBytes(3) }).ToBytes(),
                                                    new Parameter({ type: 0xd1, data: Util.Bit.UInt16ToBytes(1024) }).ToBytes(),
                                                    new Parameter({ type: 0xd2, data: Util.Bit.UInt16ToBytes(66) }).ToBytes(),
                                                    new Parameter({ type: 0xd3, data: Util.Bit.BufferBytes(newRoom.name) }).ToBytes(),
                                                    new Parameter({ type: 0xd5, data: Util.Bit.UInt8ToBytes(1) }).ToBytes(),
                                                    new Parameter({ type: 0xcb, data: Util.Bit.BufferBytes(newRoom.creator) }).ToBytes(),
                                                    new Parameter({ type: 0x03, data: Util.Bit.UInt8ToBytes(10) }).ToBytes(),
                                                    new Parameter({ type: 0x04, data: Util.Bit.UInt8ToBytes(20) }).ToBytes(),
                                                    new Parameter({ type: 0x02, data: Util.Bit.UInt16ToBytes(0) }).ToBytes(),
                                                    new Parameter({ type: 0x05, data: Util.Bit.UInt16ToBytes(newRoom.exchange).concat(
                                                        Util.Bit.UInt8ToBytes(newRoom.cookie.length),
                                                        Util.Bit.BufferBytes(newRoom.cookie),
                                                        Util.Bit.UInt16ToBytes(0)
                                                    )}).ToBytes()
                                                ].flat()
                                            )})
                                        ]
                                    }).ToBytes());
                                    return;
                                }
                            }
                        }
                        break;
                    case 0x000e: // chat service
                        switch(snac.type) {
                            case 0x05: {
                                let userInfoBlock = new Parameter({ type: 0x03, data: Util.Bit.UInt8ToBytes(session.parent.user.ScreenName.length).concat(
                                    Util.Bit.BufferBytes(session.parent.user.ScreenName),
                                    Util.Bit.UInt16ToBytes(0),
                                    Util.Bit.UInt16ToBytes(3),
                                    new Parameter({ type: 0x01, data: Util.Bit.UInt16ToBytes(0) }).ToBytes(),
                                    new Parameter({ type: 0x0f, data: Util.Bit.UInt32ToBytes(0) }).ToBytes(),
                                    new Parameter({ type: 0x03, data: Util.Bit.UInt32ToBytes(0) }).ToBytes()
                                )});
                                let parameterMessageInformation = snac.parameters.find(function(item) { return item.type === 0x05; });
                                // reflection ??
                                SendData(session, snac.requestId, 2, new SNAC({
                                    foodGroup: 0x0e,
                                    type: 0x06,
                                    flags: 0,
                                    requestId: snac.requestId,
                                    extensions: {
                                        cookie: snac.cookie,
                                        channel: snac.channel
                                    },
                                    parameters: [
                                        userInfoBlock,
                                        new Parameter({ type: 0x01, data: Util.Bit.UInt16ToBytes(32) }),
                                        parameterMessageInformation
                                    ]
                                }).ToBytes());
                                let userSessions = session.chat.sessions.filter(function(item) { return item.parent.user.ScreenName !== session.parent.user.ScreenName; });
                                userSessions.forEach(function(userSession) {
                                    SendData(userSession, 0, 2, new SNAC({
                                        foodGroup: 0x0e,
                                        type: 0x06,
                                        flags: 0,
                                        requestId: 0,
                                        extensions: {
                                            cookie: snac.cookie,
                                            channel: snac.channel
                                        },
                                        parameters: [
                                            userInfoBlock,
                                            parameterMessageInformation
                                        ]
                                    }).ToBytes());
                                });
                                return;
                            }
                        }
                        break;
                }
                // All other SNACs
                console.log('AOS unhandled ( group', session.groupId, ')', snac)
                return;
            }
            case 4: { // disconnect
                return;
            }
        }
    }
});
aosServer.listen(_options.aosPort, _options.ip).on('listening', function () { console.log('AOS socket listening on', aosServer.address()); }).on('error', function (err) { console.log('AOS server socket error:', err); });