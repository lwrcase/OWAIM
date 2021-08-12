"use strict";

const extend = require('extend');
const Util = require('./util.js');

class ChatManager {
    #collection;
    constructor() {
        this.#collection = [];
    }
    add(item) {
        var b = extend(true, {}, { exchange: null, cookie: null, instance: 0, detailLevel: 1, creator: null, name: null, charset: null, lang: null, users: [], sessions: [] }, item);
        this.#collection.push(b);
        return b;
    }
    remove(item) {
        if (typeof item === 'string') {
            var a = this.#collection.find(function(r) { return r.name === item });
            if (a) {
                this.#collection.splice(this.#collection.indexOf(a), 1);
            }
            return this;
        }
        if (this.#collection.indexOf(item) > -1) {
            this.#collection.splice(this.#collection.indexOf(item), 1);
        }
        return this;
    }
    item({ name, cookie } = {}) {
        if (name) {
            return this.#collection.find(function(item) { return item.name === name; });
        }
        if (cookie) {
            return this.#collection.find(function(item) { return item.cookie === cookie; });
        }
        return null;
    }
    findNonExistantSession(screenName, cookie) {
        return this.#collection.filter(function(item) { return item.cookie === cookie && (item.users && item.users.indexOf(screenName) > -1) });
    }
    get collection() {
        return this.#collection;
    }
}

module.exports = ChatManager;