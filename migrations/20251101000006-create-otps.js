'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('otps', {
      id: {
        type: Sequelize.STRING(36),
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'E.164 format phone number'
      },
      hashedSecret: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Hashed OTP code'
      },
      expiresAt: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: 'Expiration timestamp in milliseconds'
      },
      attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      status: {
        type: Sequelize.ENUM('pending', 'verified', 'expired', 'locked'),
        defaultValue: 'pending'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex('otps', ['phone']);
    await queryInterface.addIndex('otps', ['status']);
    await queryInterface.addIndex('otps', ['expiresAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('otps');
  }
};
