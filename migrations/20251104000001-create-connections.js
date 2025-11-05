'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('connections', {
      id: {
        type: Sequelize.STRING(36),
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      requesterId: {
        type: Sequelize.STRING(36),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User who sent the connection request'
      },
      receiverId: {
        type: Sequelize.STRING(36),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User who received the connection request'
      },
      status: {
        type: Sequelize.ENUM('pending', 'accepted', 'rejected'),
        defaultValue: 'pending',
        allowNull: false
      },
      respondedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the connection was accepted/rejected'
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

    // Add indexes
    await queryInterface.addIndex('connections', ['requesterId']);
    await queryInterface.addIndex('connections', ['receiverId']);
    await queryInterface.addIndex('connections', ['status']);
    await queryInterface.addIndex('connections', ['requesterId', 'receiverId'], {
      unique: true,
      name: 'unique_connection_pair'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('connections');
  }
};
