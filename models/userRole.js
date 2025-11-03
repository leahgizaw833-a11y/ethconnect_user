const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserRole = sequelize.define('UserRole', {
    id: {
      type: DataTypes.STRING(36),
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false
    },
    roleId: {
      type: DataTypes.STRING(36),
      allowNull: false
    }
  }, {
    tableName: 'user_roles',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId', 'roleId'] }
    ]
  });

  return UserRole;
};
