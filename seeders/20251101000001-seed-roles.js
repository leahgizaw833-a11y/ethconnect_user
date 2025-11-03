'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const roles = [
      { id: uuidv4(), name: 'user', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), name: 'admin', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), name: 'employer', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), name: 'employee', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), name: 'doctor', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), name: 'teacher', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), name: 'landlord', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), name: 'tenant', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), name: 'buyer', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), name: 'seller', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), name: 'service_provider', createdAt: new Date(), updatedAt: new Date() }
    ];

    await queryInterface.bulkInsert('Roles', roles, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Roles', null, {});
  }
};
