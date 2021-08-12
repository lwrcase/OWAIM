"use strict";

const Database = require('./db.js');
const extend = require('extend');
const Parameter = require('./parameter.js');
const SNAC = require('./snac.js');
const Util = require('./util.js');

var db = new Database();

class User {
    ID;
    ScreenName;
    FormattedScreenName;
    Password;
    TemporaryEvil;
    PermanentEvil;
    EmailAddress;
    Class;
    Confirmed;
    Internal;
    Suspended;
    Deleted;
    Notes;
    LastSignonDate;
    CreationDate;
    LoggedIPAddresses;
    RegisteredIPAddress;
    constructor(a) {
        if (a && typeof a === 'object') {
            extend(this, a);
        }
    }
    async getFeedbagBuddyList() {
        var c = await db.getBuddyList(this.ID);
        return c ? c : [];
    }
    async getFeedbagTimestamp() {
        var c = await db.getFeedbagTimestamp(this.ID);
        return c ? c : Util.Dates.GetTimestamp();
    }
    async updateStatus(session, sessions, sendDataCallback) {
        var $this = this;

        let onBuddyList = await db.getOnBuddyList(this.ScreenName);
        let myBuddyList = await db.getBuddyList(this.ID);

        let onBuddyListSessions = sessions.collection.filter(function(item) { return onBuddyList.indexOf(item.user.ID) > -1; });
        let myBuddyListSessions = sessions.collection.filter(function(item) { return myBuddyList.find(function(i) { return i.Name === item.user.ScreenName && i.ClassID === 0 }) });

        onBuddyListSessions.forEach(function(item) {
            if (item.socket) {
                if ($this.SignedOn) {
                    sendDataCallback(item, 0, 2, new SNAC({
                        foodGroup: 0x0003,
                        type: 0x000b,
                        flags: 0,
                        requestId: 0,
                        extensions: {
                            formattedScreenName: $this.FormattedScreenName
                        },
                        parameters: [
                            new Parameter({ type: 0x01, data: Util.Bit.UInt32ToBytes(Util.Bit.UserClass($this.Class, $this.AwayMessage && $this.AwayMessage.length ? true : false)) }),
                            new Parameter({ type: 0x03, data: Util.Bit.UInt32ToBytes($this.SignedOnTimestamp) }),
                            new Parameter({ type: 0x0d, data: $this.Capabilities }),
                            new Parameter({ type: 0x0f, data: Util.Bit.UInt32ToBytes(0) }),
                        ]
                    }).ToBytes());
                } else {
                    sendDataCallback(item, 0, 2, new SNAC({
                        foodGroup: 0x0003,
                        type: 0x000c,
                        flags: 0,
                        requestId: 0,
                        extensions: {
                            formattedScreenName: $this.FormattedScreenName
                        },
                        parameters: [
                            new Parameter({ type: 0x01, data: Util.Bit.UInt16ToBytes(0) })
                        ]
                    }).ToBytes());
                }
            }
        });
        if (session.socket) {
            myBuddyListSessions.forEach(function(item) {
                if (item.user.SignedOn) {
                    sendDataCallback(session, 0, 2, new SNAC({
                        foodGroup: 0x0003,
                        type: 0x000b,
                        flags: 0,
                        requestId: 0,
                        extensions: {
                            formattedScreenName: item.user.FormattedScreenName
                        },
                        parameters: [
                            new Parameter({ type: 0x01, data: Util.Bit.UInt32ToBytes(Util.Bit.UserClass(item.user.Class, item.user.AwayMessage && item.user.AwayMessage.length ? true : false)) }),
                            new Parameter({ type: 0x03, data: Util.Bit.UInt32ToBytes(item.user.SignedOnTimestamp) }),
                            new Parameter({ type: 0x0d, data: item.user.Capabilities }),
                            new Parameter({ type: 0x0f, data: Util.Bit.UInt32ToBytes(0) }),
                        ]
                    }).ToBytes());   
                } else {
                    sendDataCallback(item, 0, 2, new SNAC({
                        foodGroup: 0x0003,
                        type: 0x000c,
                        flags: 0,
                        requestId: 0,
                        extensions: {
                            formattedScreenName: item.user.FormattedScreenName
                        },
                        parameters: [
                            new Parameter({ type: 0x01, data: Util.Bit.UInt16ToBytes(0) })
                        ]
                    }).ToBytes());
                }
            });       
        }
    }
    async updateAdminInfo() {
        await db.updateAdminInfo(this.ID, this.FormattedScreenname, this.EmailAddress);
    }
    async addFeedbagItem(name, groupId, itemId, classId, attributes) {
        return await db.addFeedbagItem(this.ID, name, groupId, itemId, classId, Util.Bit.BytesBuffer(attributes));
    }
    async updateFeedbagItem(name, groupId, itemId, classId, attributes) {
        var $this = this;
        var b = await db.getBuddyList(this.ID);
        var c = b.find(function(item) { return item.ID == $this.ID && item.GroupID == groupId && item.BuddyID == itemId && item.ClassID == classId });
        if (c) {
            let d = await db.updateFeedbagItem(c.ID, name, c.GroupID, c.BuddyID, c.ClassID, Util.Bit.BufferBytes(attributes));
            if (d) {
                return d;
            }
            return c;
        }
        return b;
    }
    async deleteFeedbagItem(name, groupId, itemId, classId, attributes) {
        var $this = this;
        var b = await db.getBuddyList(this.ID);
        var c = b.find(function(item) { return item.ID == $this.ID && item.Name == name && item.GroupID == groupId && item.BuddyID == itemId && item.ClassID == classId });
        if (c) {
            let d = await db.deleteFeedbagItem(c.ID, c.Name, c.GroupID, c.BuddyID, c.ClassID, Util.Bit.BytesBuffer(attributes));
            if (d) {
                return d;
            }
            return c;
        }
        return null;
    }
    async updateFeedbagMeta() {
        let b = await db.updateFeedbagMeta(this.ID);
        if (b) {
            this.FeedbagTimestamp = b.timestamp;
            this.FeedbagItems = b.count;
        }
    }
    static async getSingleUser(screenName) {
        var b = await db.getUser(screenName);
        return b ? new User(b) : null;
    }
}

module.exports = User;