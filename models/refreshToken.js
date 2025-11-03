const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RefreshToken = sequelize.define('RefreshToken', {
    id: {
      type: DataTypes.STRING(36),
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      comment: 'User ID this token belongs to'
    },
    hashedToken: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Bcrypt hashed refresh token'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Token expiration date'
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When token was revoked (null if still valid)'
    },
    replacedByTokenId: {
      type: DataTypes.STRING(36),
      allowNull: true,
      comment: 'ID of token that replaced this one during rotation'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata (device info, IP, etc.)'
    }
  }, {
    tableName: 'refresh_tokens',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['expiresAt'] },
      { fields: ['revokedAt'] }
    ]
  });

  return RefreshToken;
};
