"use strict";

const extend = require('extend');

module.exports = class Options {
    ip = '127.0.0.1';
    aosPort = 5192;
    authPort = 5190;
    bosPort = 5191;
    constructor(params) {
        try{
            extend(this, JSON.parse(params.slice(2).join('').replace(/\'/g, '"')));
        }
        catch { }
    }
};