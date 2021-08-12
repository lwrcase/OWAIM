"use strict";

const Fragment = require('./fragment.js');
const Util = require('./util.js');

class Parameter {
    type;
    length;
    data;
    constructor(a) {
        if (a && typeof a === 'object') {
            this.type = a.type;
            this.length = a.length !== null && a.length !== undefined ? a.length : a.data ? a.data.length : 0;
            this.data = a.data ? a.data : []
        }
    }
    ToBytes() {
        return Util.Bit.UInt16ToBytes(this.type).concat(Util.Bit.UInt16ToBytes(this.length ? this.length : this.data ? this.data.length : 0), this.data);
    }
    static GetParameters(snacFoodGroup, snacType, bytes) {
        var _buffer = [...bytes];
        var out = [];
        while (_buffer.length >= 4) {
            var type = Util.Bit.BytesToUInt16(_buffer.splice(0, 2));
            var length = Util.Bit.BytesToUInt16(_buffer.splice(0, 2));
            var payload = _buffer.splice(0, length);
            if (snacFoodGroup === 0x04 && snacType === 0x06 && type === 0x02) {
                let fragments = Fragment.GetFragments(payload);
                out.push(new Parameter({ type: type, length: length, data: fragments}));
            } else {
                out.push(new Parameter({ type: type, length: length, data: payload}));
            }
        }
        return out;
    }
}

module.exports = Parameter;