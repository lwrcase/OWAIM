"use strict";

const Util = require('./util.js');

class Family {
    type;
    constructor(a) {
        if (a && !Array.isArray(a) && typeof a === 'object') {
            this.type = a.type;
            if (a.version) {
                this.version = a.version;
            }
        }
    }
    ToBytes() {
        return this.version ? Util.Bit.UInt16ToBytes(this.type).concat(Util.Bit.UInt16ToBytes(this.version)) : Util.Bit.UInt16ToBytes(this.type);
    }
    static GetFamilies(bytes) {
        var _buffer = [...bytes];
        var out = [];
        while (_buffer.length >= 4) {
            var type = Util.Bit.BytesToUInt16(_buffer.splice(0, 2));
            var version = Util.Bit.BytesToUInt16(_buffer.splice(0, 2));
            out.push(new Family({ type: type, version: version}));
        }
        return out;
    }
}

module.exports = Family;