"use strict";

const Util = require('./util.js');

class Interest {
    type;
    id;
    name;
    constructor(a) {
        if (a && !Array.isArray(a) && typeof a === 'object') {
            this.type = a.type;
            this.id = a.id;
            this.length = a.length ? a.length : a.name.length;
            this.name = a.name;
        }
    }
    ToBytes() {
        return Util.Bit.UInt8ToBytes(this.type).concat(Util.Bit.UInt8ToBytes(this.id), Util.Bit.UInt16ToBytes(this.length), Util.Bit.BufferBytes(this.name));
    }
    static GetInterests(bytes) {
        var _buffer = [...bytes];
        var out = [];
        while (_buffer.length > 4) {
            let type = Util.Bit.BytesToUInt8(b.splice(0, 1));
            let id = Util.Bit.BytesToUInt8(b.splice(0, 1));
            let length = Util.Bit.BytesToUInt16(b.splice(0, 2));
            let name = Util.Bit.BytesToString(b.splice(0, length));
            out.push({ type: type, id: id, length: length, name: name });
        }
    }

}

module.exports = Interest;