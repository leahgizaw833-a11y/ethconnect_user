'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('refresh_tokens', {
      id: {
        type: Sequelize.STRING(36),
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.STRING(36),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      hashedToken: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Bcrypt hashed refresh token'
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      revokedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      replacedByTokenId: {
        type: Sequelize.STRING(36),
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
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

    await queryInterface.addIndex('refresh_tokens', ['userId']);
    await queryInterface.addIndex('refresh_tokens', ['expiresAt']);
    await queryInterface.addIndex('refresh_tokens', ['revokedAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('refresh_tokens');
  }
};
