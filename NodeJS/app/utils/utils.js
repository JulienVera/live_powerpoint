"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const CONFIG = JSON.parse(process.env.CONFIG);

let ssn;


class Utils {

    static createContentFile (content, cb) {
        let filePath = Utils.getDataFilePath(content.fileName);
        fs.writeFile(filePath, content.getData(), "utf8", function(err) {
            if (err) {console.error(err); return cb(err);}

            Utils.createMetadataFile(content, cb);
        });
    };

    static createMetadataFile (content, cb) {
        let filePath = Utils.getMetaFilePath(content.id);
        fs.writeFile(filePath, JSON.stringify(content), "utf8", function(err) {
            if (err) {console.error(err); return cb(err);}

            return cb();
        });
    };

    static unlinkFiles (obj, id, callback) {
        fs.unlink(Utils.getMetaFilePath(id), function(err) {
            if (err) {console.error(err); return callback(err);}

            fs.unlink(Utils.getDataFilePath(obj.fileName), function(err) {
                if (err) {console.error(err); return callback(err);}

                callback();
            });
        });
    }

    static readFile (fileName, cb) {
        fs.readFile(path.join(CONFIG.contentDirectory, fileName), "utf8", function(err, data) {
            if (err) {console.error(err); return cb(err);}

            cb(null, JSON.parse(data));
        });
    };

    static generateUUID () {
        let d = new Date().getTime();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            let r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c==='x' ? r : (r&0x3|0x8)).toString(16);
        });
    };

    static fileExists (path, callback) {
        fs.stat(path, function(err, stat) {
            if (err) {
                callback(err);
            } else {
                if (stat.isFile()) {
                    callback(null);
                }
            }
        });
    };

    static readFileIfExists (path, callback) {
        Utils.fileExists(path, function(err) {
            if (err) {
                callback(err);
            } else {
                fs.readFile(path, callback);
            }
        });
    };

    static getMetaFilePath (id) {
        return path.join(CONFIG.contentDirectory, id + ".meta.json");
    };

    static getDataFilePath (fileName) {
        return path.join(CONFIG.contentDirectory, fileName);
    };

    static getNewFileName (id, originalFileName) {
        return id + '.' + originalFileName.split('.').pop();
    };

    static handle_500_err (res, err) {
        console.error(err);
        return res.status(500).end(err.message);
    }

    static verify_login(request, response) {
        ssn = request.session;
        let data = JSON.stringify({
            "login": request.body.login,
            "pwd": request.body.password
        });

        let options = {
            method: "POST",
            host: "localhost",
            port: "8080",
            path: "/FrontAuthWatcherWebService/rest/WatcherAuth",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Content-Length": data.length
            }
        };

        let req = http.request(options, function (res) {
            let msg = "";
            res.setEncoding("utf8");

            res.on("data", function (chunk) {msg += chunk});

            res.on("end", function () {
                if (msg === "") {
                    let emsg = "Empty reply from JEE webservice";
                    console.log(emsg);
                    response.send(emsg);
                } else {
                    msg = JSON.parse(msg);
                    ssn.role = msg.role;

                    if (ssn.role === "admin") {
                        response.redirect("/admin");
                    } else if (msg.role === "user"){
                        response.redirect("/watch");
                    } else {response.redirect("/")}
                }
            });
        }).on("error", function(error) {
            console.log(error);
            response.send(
                "Error while connecting to JEE webservice. Please verify " +
                "the server is running an try again."
            )
        });

        req.write(data);
        req.end();
    }

    static isLoggedIn (req, res, next) {
        if (req.session.role === "admin") {
            next();
        } else {
            res.redirect("/");
        }
    }
}

module.exports = Utils;