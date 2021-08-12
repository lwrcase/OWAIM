const crypto = require('crypto');

var Bit = {
    BytesToString: function(data) {
        return Bit.BytesBuffer(data).toString('ascii');
    },
    BufferBytes: function (data) {
        return Buffer.from(data).toJSON().data;
    },
    BytesBuffer: function (data) {
        return Buffer.from(data);
    },
    BytesToUInt8: function (bytes) {
        return Buffer.from(bytes).readUInt8();
    },
    BytesToUInt16: function (bytes) {
        return Buffer.from(bytes).readUInt16BE();
    },
    BytesToUInt32: function (bytes) {
        return Buffer.from(bytes).readUInt32BE();
    },
    UInt8ToBytes: function (num) {
        var b = Buffer.alloc(1);
        b.writeUInt8(num);
        return b.toJSON().data;
    },
    UInt16ToBytes: function (num) {
        var b = Buffer.alloc(2);
        b.writeUInt16BE(num)
        return b.toJSON().data;
    },
    UInt32ToBytes: function (num) {
        var b = Buffer.alloc(4);
        b.writeUInt32BE(num)
        return b.toJSON().data;
    },
    UserClass: function UserClass (userClass, away) {
        return away ? 0x20 & userClass ? userClass : 0x20 | userClass : 0x20 & userClass ? 0x20 ^ userClass : userClass;
    },
    BytesToChunkArray: function(bytes, size, formatter) {
        return Array(Math.ceil(bytes.length / size)).fill().map((_, index) => index * size).map(begin => bytes.slice(begin, begin + size)).map(function(array) { 
            return formatter ? formatter(array) : array;
        });
    }
};

var Constants = {
    _FLAP_VERSION: [0, 0, 0, 1],
    _AIM_MD5_STRING: 'AOL Instant Messenger (SM)'
};

var Crypto = {
    MD5: function (string) {
        var hasher = crypto.createHash('md5');
        hasher.update(string);
        return hasher.digest();
    }
};

var Dates = {
    GetTimestamp: function () {
        return Math.floor(new Date().getTime() / 1000);
    }
};

var Strings = {
    DecimalToHexString: function (code, prefix) {
        return [prefix ? '0x' : '', ['00', code.toString(16)].join('').slice(-2)].join('');
    },
    DecimalToHex: function (num) {
        return !isNaN(parseInt(num.toString(16))) ? parseInt(num.toString(16)) : ['00', num.toString(16)].join('').slice(-2);
    },
    HexToDecimal: function (code) {
        return parseInt(code, 16);
    },
    BytesToHexString: function (bytes) {
        return bytes.map(function (item) { return Strings.DecimalToHexString(item); }).join('');
    },
    HexStringToBytes: function(string) {
        return string.match(/.{1,2}/g).map(function(item) { return parseInt(item, 16); });
    },
    GenerateInt: function (lowerLimit, upperLimit) {
        return Math.floor((((upperLimit - lowerLimit) + 1) * Math.random()) + lowerLimit);
    },
    GenerateTicket: function () {
        var out = [];
        for (i = 0; i < 10; i++) {
            out.push(String.fromCharCode(Strings.GenerateInt(48, 57)));
        }
        return out.join('');
    },
    GenerateChatCookie: function() {
        out = [];
        for (i = 0; i < 6; i ++) {
            out.push(String.fromCharCode(Strings.GenerateInt(48, 57)))
        }
        return out.join('');
    },
    GenerateCookie: function () {
        var out = [];
        for (i = 0; i < 256; i++) {
            out.push(String.fromCharCode(Strings.GenerateInt(0, 255)));
        }
        return Crypto.MD5(out.join(''));
    },
    RoastPassword: function (ticket, password) {
        return Bit.BufferBytes(Crypto.MD5(Bit.BytesBuffer(Bit.BufferBytes(Buffer.from(ticket)).concat(Bit.BufferBytes(Crypto.MD5(password)), Bit.BufferBytes(Constants._AIM_MD5_STRING)))));
    },
    TrimData: function(data) {
        return data.toLowerCase().replace(/\s/g, '');
    }
};

module.exports = {
    Bit: Bit,
    Constants: Constants,
    Crypto: Crypto,
    Dates: Dates,
    Strings: Strings
};
