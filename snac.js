"use strict";

const extend = require('extend');
const Family = require('./family.js');
const Interest = require('./interest.js');
const Parameter = require('./parameter.js');
const SSI = require('./ssi.js');
const Util = require('./util.js');

class SNAC {
    foodGroup;
    type;
    flags;
    requestId;
    constructor(a) {
        if (a && Array.isArray(a)) {
            let packet = a.slice(0, 10);
            this.foodGroup = Util.Bit.BytesToUInt16(packet.slice(0, 2));
            this.type = Util.Bit.BytesToUInt16(packet.slice(2, 4));
            this.flags = Util.Bit.BytesToUInt16(packet.slice(4, 6));
            this.requestId = Util.Bit.BytesToUInt32(packet.slice(6, 10));
            if (a.length > 10) {
                let payload = a.slice(10);
                if (payload.length > 0) {
                    if (this.foodGroup === 0x13 && this.type === 0x05) {
                        this.date = payload.slice(0, 4);
                        this.count = payload.length > 4 ? payload.slice(4, 6) : [];
                    } else if (this.foodGroup === 0x01 && this.type === 0x0f) {
                        let formattedScreenNameLength = Util.Bit.BytesToUInt8(payload.splice(0, 1));
                        this.formattedScreenName = payload.splice(0, formattedScreenNameLength);
                        this.warningLevel = Util.Bit.BytesToUInt16(payload.splice(0, 2));
                        this.parameters = Parameter.GetParameters(this.foodGroup, this.type, payload.slice(2));
                    } else if (this.foodGroup === 0x01 && this.type === 0x11) {
                        this.idle = payload.splice(0, 4);
                    } else if (this.foodGroup === 0x01 && this.type === 0x0f) {
                        payload.splice(0, 4);
                        this.interests = Interest.GetInterests(payload);
                    } else if (this.foodGroup === 0x17 && this.type === 0x07) {
                        this.authKey = payload.slice(2, Util.Bit.BytesToUInt16(payload.slice(0, 2)));
                    } else if (this.foodGroup === 0x01 && this.type === 0x17) {
                        this.families = Family.GetFamilies(payload);
                    } else if (this.foodGroup === 0x01 && this.type === 0x08) {
                        this.groups = Util.Bit.BytesToChunkArray(payload, 2, function(a) { return Util.Bit.BytesToUInt16(a); });
                    } else if (this.foodGroup === 0x02 && this.type === 0x0b) {
                        this.screenName = payload.slice(1, Util.Bit.BytesToUInt8(payload.slice(0, 1)) + 1);
                    } else if (this.foodGroup === 0x01 && this.type === 0x04) {
                        this.groupId = payload.splice(0, 2);
                        if (payload.length > 0) {
                            this.parameters = Parameter.GetParameters(this.foodGroup, this.type, payload);
                        }
                    } else if (this.foodGroup === 0x13 && (this.type === 0x08 || this.type === 0x09 || this.type === 0x0a)) {
                        this.items = SSI.GetSSI(payload);
                    } else if (this.foodGroup === 0x04 && this.type === 0x06) {
                        this.cookie = payload.splice(0, 8);
                        this.channel = payload.splice(0, 2);
                        this.screenName = payload.splice(0, Util.Bit.BytesToUInt8(payload.splice(0, 1)));
                        this.parameters = Parameter.GetParameters(this.foodGroup, this.type, payload);
                        this.parameters.find(function(item) { return item.type === 0x04 }) ? this.autoResponse = true : this.autoResponse = false;
                    } else if (this.foodGroup === 0x02 && this.type === 0x15) {
                        this.requestFlags = payload.splice(0, 4);
                        this.screenName = payload.splice(0, Util.Bit.BytesToUInt8(payload.splice(0, 1)));
                    } else if (this.foodGroup === 0x0d && (this.type === 0x08 || this.type === 0x04)) {
                        this.exchange = payload.splice(0, 2);
                        this.cookie = payload.splice(0, Util.Bit.BytesToUInt8(payload.splice(0, 1)));
                        this.instance = payload.splice(0, 2);
                        this.detailLevel = payload.splice(0, 1);
                        this.parameters = Parameter.GetParameters(this.foodGroup, this.type, payload.splice(2));
                    } else if (this.foodGroup === 0x0e && this.type === 0x05) {
                        this.cookie = payload.splice(0, 8);
                        this.channel = Util.Bit.BytesToUInt16(payload.splice(0, 2));
                        this.parameters = Parameter.GetParameters(this.foodGroup, this.type, payload);
                    } else {
                        this.parameters = Parameter.GetParameters(this.foodGroup, this.type, payload);
                    }
                }
            }
            return;
        }
        if (a && typeof a === 'object' && !Array.isArray(a)) {
            this.foodGroup = a.foodGroup;
            this.type = a.type;
            this.flags = a.flags;
            this.requestId = a.requestId;
            if (a.parameters && Array.isArray(a.parameters)) {
                this.parameters = a.parameters;
            }
            if (a.extensions && typeof a.extensions === 'object') {
                extend(this, a.extensions);
            }
            return;
        }
        throw('Exception: Unable to create new SNAC. Constructor accepts an array of bytes or an object with the parameters foodGroup, type, flags, parameters, and extensions.');
    }
    ToBytes() {
        let out = Util.Bit.UInt16ToBytes(this.foodGroup).concat(Util.Bit.UInt16ToBytes(this.type), Util.Bit.UInt16ToBytes(this.flags), Util.Bit.UInt32ToBytes(this.requestId));
        if (this.foodGroup === 0x17 && this.type === 0x07) {
            out = out.concat(Util.Bit.UInt16ToBytes(this.authKey.length), Util.Bit.BufferBytes(this.authKey));
        }
        if (this.foodGroup === 0x02 && this.type === 0x06) {
            out = out.concat(
                Util.Bit.UInt8ToBytes(this.formattedScreenName.length),
                Util.Bit.BufferBytes(this.formattedScreenName),
                Util.Bit.UInt16ToBytes(0),
                Util.Bit.UInt16ToBytes(3)
            )
        }
        if (this.foodGroup === 0x03 && this.type === 0x0b) {
            out = out.concat(
                Util.Bit.UInt8ToBytes(this.formattedScreenName.length),
                Util.Bit.BufferBytes(this.formattedScreenName),
                Util.Bit.UInt16ToBytes(0),
                Util.Bit.UInt16ToBytes(this.parameters.length)
            );
        }
        if (this.foodGroup === 0x03 && this.type === 0x0c) {
            out = out.concat(
                Util.Bit.UInt8ToBytes(this.formattedScreenName.length),
                Util.Bit.BufferBytes(this.formattedScreenName),
                Util.Bit.UInt16ToBytes(0),
                Util.Bit.UInt16ToBytes(this.parameters.length)
            );
        }
        if (this.foodGroup === 0x0f && this.type === 0x05) {
            out = out.concat(
                Util.Bit.UInt16ToBytes(1),
                Util.Bit.UInt16ToBytes(this.interests.length),
                this.interests.map(function(item) { return item.ToBytes(); }).flat()
            );
        }
        if (this.foodGroup === 0x01 && this.type === 0x03) {
            out = out.concat(this.families.map(function(item) { return Util.Bit.UInt16ToBytes(item); }).flat());
        }
        if (this.foodGroup === 0x01 && this.type === 0x18) {
            out = out.concat(this.families.map(function(item) { return item.ToBytes() }).flat());
        }
        if (this.foodGroup === 0x04 && this.type === 0x07) {
            out = out.concat(
                Util.Bit.BufferBytes(this.cookie),
                Util.Bit.UInt16ToBytes(this.channel),
                Util.Bit.UInt8ToBytes(this.formattedScreenName.length),
                Util.Bit.BufferBytes(this.formattedScreenName),
                [0x00, 0x00, 0x00, 0x04, 0x00, 0x01, 0x00, 0x02, 0x00, 0x10, 0x00, 0x06, 0x00, 0x04, 0x00, 0x00, 0x01, 0x00, 0x00, 0x0f, 0x00, 0x04, 0x00, 0x00, 0x57, 0x0b, 0x00, 0x03, 0x00, 0x04, 0x40, 0xe6, 0xda, 0xb8]
            );
        }
        if (this.foodGroup === 0x04 && this.type === 0x01) {
            out = out.concat(
                Util.Bit.UInt16ToBytes(this.errorId)
            );
        }
        if (this.foodGroup === 0x07 && this.type === 0x03) {
            out = out.concat(
                Util.Bit.UInt16ToBytes(this.permissions),
                Util.Bit.UInt16ToBytes(this.parameters.length),
            );
        }
        if (this.foodGroup === 0x01 && this.type === 0x0f) {
            out = out.concat(
                Util.Bit.UInt8ToBytes(this.formattedScreenName.length),
                Util.Bit.BufferBytes(this.formattedScreenName),
                Util.Bit.UInt16ToBytes(0),
                Util.Bit.UInt16ToBytes(this.parameters.length)
            );
        }
        if (this.foodGroup === 0x0e && this.type === 0x03) {
            out = out.concat(
                Util.Bit.UInt8ToBytes(this.formattedScreenName.length),
                Util.Bit.BufferBytes(this.formattedScreenName),
                Util.Bit.UInt16ToBytes(0),
                Util.Bit.UInt16ToBytes(this.parameters.length) 
            );
        }
        if (this.foodGroup === 0x0e && this.type === 0x04) {
            out = out.concat(
                Util.Bit.UInt8ToBytes(this.formattedScreenName.length),
                Util.Bit.BufferBytes(this.formattedScreenName),
                Util.Bit.UInt16ToBytes(0),
                Util.Bit.UInt16ToBytes(this.parameters.length) 
            );
        }
        if (this.foodGroup === 0x0e && this.type === 0x06) {
            out = out.concat(
                this.cookie,
                Util.Bit.UInt16ToBytes(this.channel)
            );
        }
        if (this.foodGroup === 0x13 && this.type === 0x0e) {
            out = out.concat(
                [0x00, 0x06, 0x00, 0x01, 0x00, 0x02, 0x00, 0x03]
            );
        }
        if (this.parameters && this.parameters.length > 0) {
            out = out.concat(this.parameters.map(function(item) { return item.ToBytes(); }).flat());
        }
        return out;
    }
}

module.exports = SNAC;