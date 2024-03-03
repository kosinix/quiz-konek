const { DataTypes } = require('sequelize')

module.exports = (modelName, sequelize) => {
    return sequelize.define(modelName, {
        title: {
            type: DataTypes.STRING,
        },
        questions: {
            type: DataTypes.JSON,
        },
    }, {
        // Other model options go here
    })
}
