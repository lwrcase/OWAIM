"use strict";

const Parameter = require('./parameter.js');
const Util = require('./util.js');

class SSI {
    name;
    groupId;
    itemId;
    classId;
    attributes;
    constructor(a = { name, groupId, itemId, classId, attributes }) {
        if (a && typeof a === 'object') {
            this.length = a.length ? a.length : a.name.length;
            this.name = a.name;
            this.groupId = a.groupId;
            this.itemId = a.itemId;
            this.classId = a.classId;
            this.attributesLength = a.attributesLength ? a.attributesLength : a.attributes.length;
            this.attributes = a.attributes;
        }
    }
    ToBytes() {
        return Util.Bit.UInt16ToBytes(this.length).concat(
            Util.Bit.BufferBytes(this.name),
            Util.Bit.UInt16ToBytes(this.groupId),
            Util.Bit.UInt16ToBytes(this.itemId),
            Util.Bit.UInt16ToBytes(this.classId),
            Util.Bit.UInt16ToBytes(this.attributesLength),
            Util.Bit.BufferBytes(this.attributes)
        );
    }
    static GetSSI(bytes) {
        var _buffer = [...bytes];
        var out = [];
        while (_buffer.length > 0) {
            let length = Util.Bit.BytesToUInt16(_buffer.splice(0, 2));
            let name = Util.Bit.BytesBuffer(_buffer.splice(0, length)).toString('ascii');
            let groupId = Util.Bit.BytesToUInt16(_buffer.splice(0, 2));
            let itemId = Util.Bit.BytesToUInt16(_buffer.splice(0, 2));
            let classId = Util.Bit.BytesToUInt16(_buffer.splice(0, 2));
            let attributesLength = Util.Bit.BytesToUInt16(_buffer.splice(0, 2));
            let attributes = _buffer.splice(0, attributesLength);
            out.push(new SSI({
                name: name,
                groupId: groupId,
                itemId: itemId,
                classId: classId,
                attributes: attributes
            }));
        }
        return out;
    }
}

module.exports = SSI;