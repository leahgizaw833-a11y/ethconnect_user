'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.STRING(36),
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      username: {
        type: Sequelize.STRING(120),
        allowNull: false,
        unique: true
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
        unique: true,
        comment: 'E.164 format'
      },
      passwordHash: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      authProvider: {
        type: Sequelize.ENUM('password', 'google', 'apple', 'phone'),
        defaultValue: 'password'
      },
      isVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'suspended', 'pending'),
        defaultValue: 'active'
      },
      lastLogin: {
        type: Sequelize.DATE,
        allowNull: true
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
    // Indexes already created via unique: true in column definitions
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  }
};
