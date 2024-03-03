const { DataTypes } = require('sequelize')

module.exports = (modelName, sequelize) => {
    return sequelize.define(modelName, {
        examId: {
            type: DataTypes.INTEGER,
        },
        status: {
            type: DataTypes.INTEGER, // 0 - waiting, 1 - ongoing, 2 - ended, 3 - paused
        },
        description: {
            type: DataTypes.STRING,
        },
        date: {
            type: DataTypes.STRING,
        },
        venue: {
            type: DataTypes.STRING,
        },
        passcode: { // Can be your room number
            type: DataTypes.STRING,
        },
        examinees: {
            type: DataTypes.JSON,
        },
        results: {
            type: DataTypes.JSON,
        }
    }, {
        // Other model options go here
    })
}
