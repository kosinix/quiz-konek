//// Core modules

//// External modules
let lodashGet = require('lodash').get;
let lodashSet = require('lodash').set;

let flashSet = (req, id, message, path = 'session.flash.${id}') => {
    lodashSet(req, path.replace('${id}', id), message);
}
let flash = {
    set: flashSet,
    get: (req, id, path = 'session.flash.${id}') => {
        path = path.replace('${id}', id)
        let r = lodashGet(req, path, '');
        lodashSet(req, path, '');
        return r;
    },
    error: (req, id, message) => {
        flashSet(req, `${id}.error`, message)
    },
    ok: (req, id, message) => {
        flashSet(req, `${id}.ok`, message)
    },
    warning: (req, id, message) => {
        flashSet(req, `${id}.warning`, message)
    },
    info: (req, id, message) => {
        flashSet(req, `${id}.info`, message)
    }
}
// Export
module.exports = flash;
