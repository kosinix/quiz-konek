module.exports = {
    createPayload: (payload, expiry) => {
        let msNow = Date.now() // milliseconds elapsed since January 1, 1970 00:00:00 UTC.
        let secondsNow = Math.floor(msNow / 1000) // Convert ms to seconds

        // Add _id aliases for flexibility
        return {
            iss: 'gsueduph',
            iat: secondsNow,
            exp: secondsNow + expiry,
            payload: payload
        }
    }
}