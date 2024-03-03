const { DataTypes } = require('sequelize')

module.exports = (modelName, sequelize) => {
    return sequelize.define(modelName, {
        examSessionId: {
            type: DataTypes.STRING,
        },
        examineeId: {
            type: DataTypes.JSON,
        },
        results: {
            type: DataTypes.JSON,
        }
    }, {
        // Other model options go here
    })
}
