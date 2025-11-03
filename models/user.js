const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.STRING(36),
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING(120),
      allowNull: true,
      unique: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
      comment: 'E.164 format (e.g., +2519...)'
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    authProvider: {
      type: DataTypes.ENUM('password', 'google', 'apple', 'phone'),
      defaultValue: 'password'
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended', 'pending'),
      defaultValue: 'active'
    },
    lastLogin: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'users',
    timestamps: true
  });

  return User;
};
