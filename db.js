"use strict";

const FS = require('fs');
const SQL = require('sqlite3').verbose();
const Util = require('./util.js');

var db = null;

class DB {
    constructor() {
        if (!FS.existsSync('./owaim.db')) {
            this.#createDatabase();
            return;
        }
        db = new SQL.Database('./owaim.db');
    }
    #createDatabase() {
        db = new SQL.Database('./owaim.db');
        db.serialize(function() {
            db.run('CREATE TABLE "Banned" ("ID" INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE, "Time" TEXT NOT NULL, "BannedBy" NUMERIC NOT NULL, "ScreenName" TEXT NOT NULL, "IPAddress" TEXT NOT NULL, "Reason" TEXT NOT NULL);')
            .run('CREATE TABLE "Feedbag" ("PID" INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE, "ID" INTEGER NOT NULL, "Name" TEXT NOT NULL, "GroupID" INTEGER NOT NULL, "BuddyID" INTEGER NOT NULL, "ClassID" INTEGER NOT NULL, "Attributes" BLOB);')
            .run('CREATE TABLE "Memberships" ("ID" INTEGER PRIMARY KEY AUTOINCREMENT, "Screenname" TEXT NOT NULL, "FormattedScreenname" TEXT NOT NULL, "Password" TEXT NOT NULL, "TemporaryEvil" INTEGER NOT NULL DEFAULT 0, "PermanentEvil" INTEGER NOT NULL DEFAULT 0, "EmailAddress" TEXT NOT NULL DEFAULT \'nobody@isp.com\', "Confirmed" INTEGER NOT NULL DEFAULT 1, "Internal" INTEGER NOT NULL DEFAULT 0, "Suspended" INTEGER NOT NULL DEFAULT 0, "Deleted" INTEGER NOT NULL DEFAULT 0, "Notes" TEXT, "LastSignonDate" TEXT, "CreationDate" TEXT, "LoggedIPAddresses" TEXT, "RegisteredIPAddress" TEXT, "FeedbagTimestamp" INTEGER NOT NULL DEFAULT 0, "FeedbagItems" INTEGER NOT NULL DEFAULT 0);')
            .run('CREATE TABLE "RateClasses" ("RateClass" INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE, "WindowSize" INTEGER NOT NULL DEFAULT 0, "ClearThreshold" INTEGER NOT NULL DEFAULT 0, "AlertThreshold" INTEGER NOT NULL DEFAULT 0, "LimitThreshold" INTEGER NOT NULL DEFAULT 0, "MinAverage" INTEGER NOT NULL DEFAULT 0, "MaxAverage" INTEGER NOT NULL DEFAULT 0);')
            .run('CREATE TABLE "RateLimitMapping" ("ID" INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE, "RateClass" INTEGER NOT NULL, "SNACFamily" INTEGER NOT NULL, "SNACSubType" INTEGER NOT NULL);')
        });
        db.serialize(function() {
            db.run('INSERT INTO "RateClasses" (WindowSize, ClearThreshold, AlertThreshold, LimitThreshold, MinAverage, MaxAverage) VALUES (80, 2500, 2000, 1500, 800, 6000);')
            .run('INSERT INTO "RateClasses" (WindowSize, ClearThreshold, AlertThreshold, LimitThreshold, MinAverage, MaxAverage) VALUES (80, 3000, 2000, 1500, 1000, 6000);')
            .run('INSERT INTO "RateClasses" (WindowSize, ClearThreshold, AlertThreshold, LimitThreshold, MinAverage, MaxAverage) VALUES (20, 5100, 5000, 4000, 3000, 6000);')
            .run('INSERT INTO "RateClasses" (WindowSize, ClearThreshold, AlertThreshold, LimitThreshold, MinAverage, MaxAverage) VALUES (20, 5500, 5300, 4200, 3000, 8000);')
            .run('INSERT INTO "RateClasses" (WindowSize, ClearThreshold, AlertThreshold, LimitThreshold, MinAverage, MaxAverage) VALUES (10, 5500, 5300, 4200, 3000, 8000);')
        });
        db.serialize(function() {
            db.run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 1);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 2);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 3);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 4);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 5);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 6);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 7);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 8);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 9);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 10);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 11);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 12);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 13);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 14);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 15);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 16);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 17);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 18);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 19);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 20);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 21);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 22);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 23);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 24);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 25);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 26);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 27);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 28);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 29);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 30);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 31);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 32);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 33);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 34);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 35);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 36);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 1, 37);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 2, 1);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 2, 2);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 2, 3);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 2, 4);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 2, 6);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 2, 7);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 2, 8);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 2, 10);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 2, 12);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 2, 13);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 2, 14);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 2, 15);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 2, 16);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 2, 17);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 2, 18);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 2, 19);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 2, 20);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 2, 21);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 3, 1);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 3, 2);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 3, 3);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 3, 6);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 3, 7);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 3, 8);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 3, 9);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 3, 10);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 3, 11);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 3, 12);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 3, 13);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 3, 14);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 4, 1);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 4, 2);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 4, 3);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 4, 4);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 4, 5);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 4, 7);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 4, 8);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 4, 9);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 4, 10);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 4, 11);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 4, 12);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 4, 13);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 4, 14);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 4, 15);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 4, 16);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 4, 17);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 4, 18);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 4, 19);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 4, 20);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 4, 21);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 6, 1);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 6, 2);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 6, 3);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 8, 1);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 8, 2);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 9, 1);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 9, 2);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 9, 3);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 9, 4);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 9, 9);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 9, 10);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 9, 11);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 10, 1);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 10, 2);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 10, 3);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 11, 1);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 11, 2);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 11, 3);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 11, 4);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 12, 1);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 12, 2);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 12, 3);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 1);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 2);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 3);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 4);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 5);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 6);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 7);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 8);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 9);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 10);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 11);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 12);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 13);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 14);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 15);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 16);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 17);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 18);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 19);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 20);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 21);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 22);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 23);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 24);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 25);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 26);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 27);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 28);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 29);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 30);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 31);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 32);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 33);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 34);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 35);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 36);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 37);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 38);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 39);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 40);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 41);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 42);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 43);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 44);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 45);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 46);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 47);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 48);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 49);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 50);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 51);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 52);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 53);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 19, 54);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 21, 1);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 21, 2);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (1, 21, 3);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (2, 3, 4);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (2, 3, 5);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (2, 9, 5);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (2, 9, 6);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (2, 9, 7);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (2, 9, 8);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (3, 2, 5);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (3, 4, 6);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (4, 2, 9);')
            .run('INSERT INTO RateLimitMapping (RateClass, SNACFamily, SNACSubType) VALUES (4, 2, 11);')
        });
    }
    getUser(screenName) {
        return new Promise(function(resolve) {
            db.get('SELECT * FROM Memberships WHERE Screenname = ?', screenName, function(err, row) {
                resolve(row ? {
                    ID: row.ID,
                    ScreenName: Util.Strings.TrimData(row.Screenname),
                    FormattedScreenName: row.FormattedScreenname,
                    Password: row.Password,
                    TemporaryEvil: row.TemporaryEvil,
                    PermanentEvil: row.PermanentEvil,
                    EmailAddress: row.EmailAddress,
                    Class: row.Internal === 1 ? 0x12 : 0x10,
                    Confirmed: row.Confirmed,
                    Internal: row.Internal,
                    Suspended: row.Suspended,
                    Deleted: row.Deleted,
                    Notes: row.Notes,
                    LastSignonDate: row.LastSignonDate,
                    CreationDate: row.CreationDate,
                    LoggedIPAddresses: row.LoggedIPAddresses,
                    RegisteredIPAddress: row.RegisteredIPAddress
                } : null)
            });
        });
    }
    getBuddyList(id) {
        return new Promise(function(resolve) {
            var rows = [];
            db.each('SELECT * FROM Feedbag WHERE [ID] = ? ORDER BY GroupID, BuddyID', id, function (err, row) {
                rows.push({ PID: row.PID, ID: row.ID, Name: row.Name, GroupID: row.GroupID, BuddyID: row.BuddyID, ClassID: row.ClassID, Attributes: row.Attributes });
            }, function () {
                if (!rows.length) {
                    let timestamp = Util.Dates.GetTimestamp();
                    db.serialize(function() {
                        // Master group. -- always needed
                        db.run('INSERT INTO Feedbag (ID, Name, GroupID, BuddyID, ClassID, Attributes) VALUES (?, ?, ?, ?, ?, ?)', id, '', 0, 0, 1, Buffer.from([0x00, 0xc8, 0x00, 0x06, 0x00, 0x01, 0x00, 0x02, 0x00, 0x03]))
                        // Buddy preferences.
                        .run('INSERT INTO Feedbag (ID, Name, GroupID, BuddyID, ClassID, Attributes) VALUES (?, ?, ?, ?, ?, ?)', id, '', 0, 1, 5, Buffer.from([0x00, 0xc9, 0x00, 0x04, 0x00, 0x61, 0xe7, 0xff, 0x00, 0xd6, 0x00, 0x04, 0x00, 0x77, 0xff, 0xff]))
                        // Buddies group.
                        .run('INSERT INTO Feedbag (ID, Name, GroupID, BuddyID, ClassID, Attributes) VALUES (?, ?, ?, ?, ?, ?)', id, 'Buddies', 1, 0, 1, Buffer.from([0x00, 0xc8, 0x00, 0x0]))
                        // Family group.
                        .run('INSERT INTO Feedbag (ID, Name, GroupID, BuddyID, ClassID, Attributes) VALUES (?, ?, ?, ?, ?, ?)', id, 'Family', 2, 0, 1, Buffer.from([0x00, 0xc8, 0x00, 0x0]))
                        // Co-Workers group.
                        .run('INSERT INTO Feedbag (ID, Name, GroupID, BuddyID, ClassID, Attributes) VALUES (?, ?, ?, ?, ?, ?)', id, 'Co-Workers', 3, 0, 1, Buffer.from([0x00, 0xc8, 0x00, 0x0]))
                        // Update user.
                        .run('UPDATE Memberships SET [FeedbagTimestamp] = ?, [FeedbagItems] = 5 WHERE [ID] = ?', timestamp, id)
                        // reload
                        .each('SELECT * FROM Feedbag WHERE [ID] = ? ORDER BY GroupID, BuddyID', id, function (err, row) {
                            rows.push({ PID: row.PID, ID: row.ID, Name: row.Name, GroupID: row.GroupID, BuddyID: row.BuddyID, ClassID: row.ClassID, Attributes: row.Attributes });
                        }, function () {
                            resolve(rows);
                        });
                    });
                } else {
                    resolve(rows);
                }
            });
        });
    }
    getOnBuddyList(screenName){
        return new Promise(function (resolve, reject) {
            var rows = []
            db.each('SELECT * FROM Feedbag WHERE Name = ? AND ClassID = 0', screenName, function (err, row) {
                rows.push(row.ID);
            }, function () {
                    resolve(rows);
            });
        });
    }
    getFeedbagTimestamp(id){
        return new Promise(function (resolve) {
            db.get('SELECT FeedbagTimestamp FROM Memberships WHERE ID = ?', id, function (err, row) {
                resolve(row ? row.FeedbagTimestamp : null);
            });
        });
    }
    updateAdminInfo(id, formattedScreenName, emailAddress) {
        return new Promise(function(resolve) {
            db.serialize(function() {
                db.run('UPDATE Memberships SET FormattedScreenname = ?, EmailAddress = ? WHERE ID = ?', formattedScreenName, emailAddress, id, function() {
                    resolve();
                });
            });
        });       
    }
    addFeedbagItem(id, name, groupId, itemId, classId, attributes) {
        return new Promise(function(resolve) {
            db.serialize(function() {
                db.run('INSERT INTO Feedbag (ID, Name, GroupID, BuddyID, ClassID, Attributes) VALUES (?, ?, ?, ?, ?, ?)', id, name, groupId, itemId, classId, attributes.length === 0 ? '' : attributes).get('SELECT * FROM Feedbag WHERE PID = last_insert_rowid()', function (err, row) {
                    resolve({ PID: row.PID, ID: row.ID, Name: row.Name, GroupID: row.GroupID, BuddyID: row.BuddyID, ClassID: row.ClassID, Attributes: row.Attributes });
                });
            });
        });
    }
    updateFeedbagItem(id, name, groupId, itemId, classId, attributes) {
        return new Promise(function(resolve) {
            db.serialize(function() {
                db.run('UPDATE Feedbag SET Name = ?, GroupID = ?, ClassID = ?, Attributes = ? WHERE ID = ? AND GroupID = ? AND BuddyID = ? AND ClassID = ?', name, groupId, classId, attributes.length === 0 ? '' : attributes, id, groupId, itemId, classId).get('SELECT * FROM Feedbag WHERE ID = ? AND GroupID = ? AND BuddyID = ? AND ClassID = ?', id, groupId, itemId, classId, function (err, row) {
                    resolve({ PID: row.PID, ID: row.ID, Name: row.Name, GroupID: row.GroupID, BuddyID: row.BuddyID, ClassID: row.ClassID, Attributes: row.Attributes });
                });
            });
        });
    }
    deleteFeedbagItem(id, name, groupId, itemId, classId, attributes) {
        console.log('db.delete', id, name, groupId, itemId, classId, attributes);
        return new Promise(function(resolve) {
            db.run('DELETE FROM Feedbag WHERE ID = ? AND GroupID = ? AND BuddyID = ? AND ClassID = ?', id, groupId, itemId, classId, function() {
                resolve({ ID: id, Name: name, GroupID: groupId, ItemID: itemId, ClassID: classId, Attributes: attributes.length === 0 ? '' : attributes });
            });
        });
    }
    updateFeedbagMeta(id) {
        return new Promise(function(resolve) {
            let timestamp = Util.Dates.GetTimestamp() + 300;
            var count = 0;
            db.get('SELECT COUNT(*) FeedbagItems FROM Feedbag WHERE ID = ?', id, function(err, row) {
                count = row.FeedbagItems;
                db.serialize(function() {
                    db.run('UPDATE Memberships SET FeedbagTimestamp = ?, FeedbagItems = ? WHERE ID = ?', timestamp, count, id, function() {
                        resolve({ timestamp: timestamp, count: count });
                    });
                });
            });
        });
    }
}

module.exports = DB;