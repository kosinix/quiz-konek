/**
 * Roles are a group of permissions.
 */

//// Core modules

//// External modules

//// Modules
const allPermissions = require('./permissions-list');

const ROLES = [
    {
        key: 'root',
        name: 'Super Admin',
        description: 'Can do anything.',
        permissions: allPermissions
    },
    {
        key: 'admin',
        name: 'System Admin',
        description: 'Can do mostly anything.',
        permissions: allPermissions
    },
    {
        key: 'boardsec',
        name: 'Board Secretary',
        description: 'Can do mostly anything.',
        permissions: [
            'read_all_exam',
            'create_exam',
            'read_exam',
            'update_exam',
            'delete_exam',
        ]
    },
    {
        key: 'member',
        name: 'Board Member',
        description: 'Can read exam.',
        permissions: [
            'read_exam'
        ]
    },
]

module.exports = ROLES