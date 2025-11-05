const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Connection = sequelize.define('Connection', {
    id: {
      type: DataTypes.STRING(36),
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    requesterId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      comment: 'User who sent the connection request'
    },
    receiverId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      comment: 'User who received the connection request'
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
      defaultValue: 'pending',
      allowNull: false
    },
    respondedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the connection was accepted/rejected'
    }
  }, {
    tableName: 'connections',
    timestamps: true,
    indexes: [
      { fields: ['requesterId'] },
      { fields: ['receiverId'] },
      { fields: ['status'] },
      { unique: true, fields: ['requesterId', 'receiverId'] } // Prevent duplicate requests
    ]
  });

  return Connection;
};
