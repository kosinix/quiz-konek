const { DataTypes } = require('sequelize')

module.exports = (modelName, sequelize) => {
    return sequelize.define(modelName, {
        examId: DataTypes.INTEGER,
        code: DataTypes.STRING,
        expiredAt: DataTypes.DATE,
    }, {
        // Other model options go here
    })
}
