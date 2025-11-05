/**
 * Script to create default admin user
 * Run this once during initial setup: node scripts/createDefaultAdmin.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Role, UserRole } = require('../models');

const DEFAULT_ADMIN = {
  username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
  email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@ethioconnect.com',
  password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456',
  phone: process.env.DEFAULT_ADMIN_PHONE || '+251911000000'
};

async function createDefaultAdmin() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected');

    // Check if admin role exists
    let adminRole = await Role.findOne({ where: { name: 'admin' } });
    if (!adminRole) {
      adminRole = await Role.create({ name: 'admin' });
      console.log('✓ Admin role created');
    } else {
      console.log('✓ Admin role already exists');
    }

    // Check if admin user exists
    const existingAdmin = await User.findOne({ 
      where: { email: DEFAULT_ADMIN.email } 
    });

    if (existingAdmin) {
      console.log('⚠ Admin user already exists with email:', DEFAULT_ADMIN.email);
      console.log('Updating password hash...');
      
      // Update password hash
      const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
      await existingAdmin.update({
        passwordHash: hashedPassword,
        isVerified: true,
        status: 'active'
      });
      console.log('✓ Admin password updated');
      
      // Check if user has admin role
      const hasAdminRole = await UserRole.findOne({
        where: { 
          userId: existingAdmin.id,
          roleId: adminRole.id
        }
      });

      if (!hasAdminRole) {
        await UserRole.create({
          userId: existingAdmin.id,
          roleId: adminRole.id
        });
        console.log('✓ Admin role assigned to existing user');
      } else {
        console.log('✓ User already has admin role');
      }
      
      console.log('═══════════════════════════════════════════════════');
      console.log('✓ Admin user ready!');
      console.log('═══════════════════════════════════════════════════');
      console.log('Email:', DEFAULT_ADMIN.email);
      console.log('Password:', DEFAULT_ADMIN.password);
      console.log('═══════════════════════════════════════════════════');
      
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
    const adminUser = await User.create({
      username: DEFAULT_ADMIN.username,
      email: DEFAULT_ADMIN.email,
      passwordHash: hashedPassword,
      phone: DEFAULT_ADMIN.phone,
      isVerified: true,
      status: 'active'
    });

    // Assign admin role
    await UserRole.create({
      userId: adminUser.id,
      roleId: adminRole.id
    });

    console.log('═══════════════════════════════════════════════════');
    console.log('✓ Default admin user created successfully!');
    console.log('═══════════════════════════════════════════════════');
    console.log('Username:', DEFAULT_ADMIN.username);
    console.log('Email:', DEFAULT_ADMIN.email);
    console.log('Password:', DEFAULT_ADMIN.password);
    console.log('═══════════════════════════════════════════════════');
    console.log('⚠ IMPORTANT: Change the default password after first login!');
    console.log('═══════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error creating default admin:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

createDefaultAdmin();
