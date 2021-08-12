"use strict";

const extend = require('extend');
const Util = require('./util.js');

class SessionManager {
    #collection;
    constructor() {
        this.#collection = [];
    }
    add(item) {
        var b = extend(true, {}, { sequence: 0 }, item);
        this.#collection.push(b);
        return b;
    }
    remove(item) {
        if (typeof item === 'string') {
            var a = this.#collection.find(function(i) { return i.user && i.user.screenName === item });
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
    reconcile(a, b) {
        extend(b, a);
        this.remove(a);
    }
    item({ screenName, ticket, cookie, serviceCookie } = {}) {
        if (screenName) {
            return this.#collection.find(function(item) { return item.user && item.user.ScreenName === Util.Strings.TrimData(screenName); });
        }
        if (ticket) {
            return this.#collection.find(function (item) { return item.ticket === ticket; });
        }
        if (cookie) {
            return this.#collection.find(function (item) { return item.cookie === cookie; });
        }
        if (serviceCookie) {
            return this.#collection.find(function (item) { return item.services ? item.services.find(function(service) { return service.cookie === serviceCookie }) : false; });
        }
        return null;
    }
    get collection() {
        return this.#collection;
    }
}

module.exports = SessionManager;