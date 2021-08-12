"use strict";

const Util = require('./util.js');

class Fragment {
    id;
    version;
    length;
    data;
    constructor(a) {
        if (a && typeof a === 'object') {
            this.id = a.id;
            this.version = a.version;
            this.length = a.length ? a.length : a.data.length;
            this.data = a.data;
        }
    }
    ToBytes() {
        return Util.Bit.UInt8ToBytes(this.id).concat(Util.Bit.UInt8ToBytes(this.version), Util.Bit.UInt16ToBytes(this.length), Util.Bit.BufferBytes(this.data));
    }
    static GetFragments(bytes) {
        var _buffer = [...bytes];
        var out = [];
        while (_buffer.length >= 4) {
            var fragId = Util.Bit.BytesToUInt8(_buffer.splice(0, 1));
            var fragVersion = Util.Bit.BytesToUInt8(_buffer.splice(0, 1));
            var length = Util.Bit.BytesToUInt16(_buffer.splice(0, 2));
            var payload = _buffer.splice(0, length);
            out.push(new Fragment({ id: fragId, version: fragVersion, length: length, data: payload }));
        }
        return out;
    }
}

module.exports = Fragment;