'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('profiles', {
      id: {
        type: Sequelize.STRING(36),
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      fullName: {
        type: Sequelize.STRING(160),
        allowNull: true
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      profession: {
        type: Sequelize.STRING(120),
        allowNull: true
      },
      languages: {
        type: Sequelize.JSON,
        allowNull: true
      },
      photoUrl: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      gender: {
        type: Sequelize.ENUM('male', 'female', 'other'),
        allowNull: true
      },
      age: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      religion: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      ethnicity: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      education: {
        type: Sequelize.STRING(120),
        allowNull: true
      },
      interests: {
        type: Sequelize.JSON,
        allowNull: true
      },
      ratingAvg: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0.00
      },
      ratingCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      verificationStatus: {
        type: Sequelize.ENUM('none', 'kyc', 'professional', 'full'),
        defaultValue: 'none'
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

    await queryInterface.addIndex('profiles', ['userId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('profiles');
  }
};
