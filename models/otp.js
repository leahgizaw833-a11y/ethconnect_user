const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OTP = sequelize.define('OTP', {
    id: {
      type: DataTypes.STRING(36),
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    hashedSecret: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    expiresAt: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('pending', 'verified', 'expired', 'locked'),
      defaultValue: 'pending'
    }
  }, {
    tableName: 'otps',
    timestamps: true,
    indexes: [
      { fields: ['phone'] },
      { fields: ['status'] },
      { fields: ['expiresAt'] }
    ]
  });

  return OTP;
};
