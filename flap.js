"use strict";

const Util = require('./util.js');

class FLAP {
    channel;
    sequence;
    size;
    constructor(a, b, c) {
        if (typeof a === 'object') {
            this.channel = Util.Bit.BytesToUInt8(a.slice(1, 2));
            this.sequence = Util.Bit.BytesToUInt16(a.slice(2, 4));
            this.size = Util.Bit.BytesToUInt16(a.slice(4, 6));
            if (a.length > 6)
                this.data = a.slice(6);
            return;
        }
        this.channel = a;
        this.sequence = b;
        if (typeof c === 'object') {
            this.size = c.length;
            this.data = c;
        } else {
            this.size = c;
        }
    }
    ToBytes() {
        return Util.Bit.BufferBytes([0x2a]).concat(
            Util.Bit.UInt8ToBytes(this.channel),
            Util.Bit.UInt16ToBytes(this.sequence),
            Util.Bit.UInt16ToBytes(this.size),
            this.data !== undefined ? this.data : Util.Bit.BufferBytes([])
        );
    }
}


module.exports = FLAP;