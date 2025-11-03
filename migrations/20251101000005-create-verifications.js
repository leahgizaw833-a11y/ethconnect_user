'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('verifications', {
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
      type: {
        type: Sequelize.ENUM('kyc', 'doctor_license', 'teacher_cert', 'business_license', 'employer_cert', 'other'),
        allowNull: false
      },
      documentUrl: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      verifiedBy: {
        type: Sequelize.STRING(36),
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      verifiedAt: {
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

    await queryInterface.addIndex('verifications', ['userId']);
    await queryInterface.addIndex('verifications', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('verifications');
  }
};
