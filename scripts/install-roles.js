/**
 * Clear roles collection and insert roles.
 * Usage: node scripts/install-roles.js
 */
//// Core modules
const path = require('path');

//// External modules
const lodash = require('lodash');

//// Modules
const pigura = require('pigura');


//// First things first
//// Save full path of our root app directory and load config and credentials
global.APP_DIR = path.resolve(__dirname+'/../').replace(/\\/g, '/'); // Turn back slash to slash for cross-platform compat
global.ENV = lodash.get(process, 'env.NODE_ENV', 'dev')

const configLoader = new pigura.ConfigLoader({
    configName: './configs/config.json',
    appDir: APP_DIR,
    env: ENV,
    logging: true
})
global.CONFIG = configLoader.getConfig()

const credLoader = new pigura.ConfigLoader({
    configName: './credentials/credentials.json',
    appDir: APP_DIR,
    env: ENV,
    logging: true
})
global.CRED = credLoader.getConfig()

const dbConn = require('../data/src/db-connect');
let rolesList = require('./install-data/roles-list'); // Do not remove semi-colon


(async ()=>{
    let dbInstance = await dbConn.connect()

    try {
        let Role = require('../data/src/models/role')('Role', dbInstance)
        await Role.drop()
        await Role.sync()

        console.log('Clearing roles collection...')

        let promises = lodash.map(rolesList, (o)=>{
            let role = Role.build({
                key: o.key,
                name: o.name,
                description: lodash.get(o, 'description', ''),
                permissions: o.permissions,
            });
            console.log(`Inserting "${o.key}" ...`)
            return role.save()
        })
        await Promise.all(promises)
        console.log(`Inserted ${promises.length} roles.`)

    } catch (err) {
        console.error(err)
        console.log('Rolling back roles collection...')
    } finally {
        dbInstance.close();
    }
})()

