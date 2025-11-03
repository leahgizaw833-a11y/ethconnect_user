const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Role = sequelize.define('Role', {
    id: {
      type: DataTypes.STRING(36),
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
      comment: 'e.g., employer, employee, doctor, admin'
    }
  }, {
    tableName: 'roles',
    timestamps: true
  });

  return Role;
};
