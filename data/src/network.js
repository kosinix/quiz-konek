/**
 */

//// Core modules
const { spawnSync } = require('child_process')

//// External modules

//// Modules

module.exports = {
    wifiName: async () => {
        const cmd = 'netsh';
        const args = ['wlan', 'show', 'interface'];
        const ls = spawnSync(cmd, args);

        let data = `${ls.stdout}`

        data = `${data}`.replace(/ +/g, ' ')
        data = `${data}`.split("\n")
        data = data.filter(d => {
            return d.includes(' SSID')
        })
        data = data.map(d => {
            d = `${d}`.trim().split(' ').at(-1)
            return d
        })
        return data.pop()
    },
    connections: (port) => {
        const os = require('os')
        const networkInterfaces = os.networkInterfaces();
        // console.log(networkInterfaces)
        let networkInterfacesGroups = Object.keys(networkInterfaces)
        // networkInterfacesGroups = networkInterfacesGroups.filter(groupName => groupName.includes('Wi'))
        let ip4Addresses = networkInterfacesGroups.map(groupName => {
            return networkInterfaces[groupName].filter(iface => {
                return iface.family === "IPv4"
            }).map(o => o.address).at(0)
        }).filter(o => o)
        // console.log(ip4Addresses)
        ip4Addresses = ip4Addresses.map(ip => `http://${ip}:${port}`)
        // ip4Addresses.push(`http://localhost:${port}`)
        return ip4Addresses
    },
}