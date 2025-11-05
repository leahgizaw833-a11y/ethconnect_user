const { Sequelize } = require('sequelize');
const config = require('../config/database');

// Get environment
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Initialize Sequelize for MySQL
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    timezone: dbConfig.timezone,
    pool: dbConfig.pool,
    define: dbConfig.define
  }
);

// Import models (flat structure - no subfolders)
const User = require('./user')(sequelize);
const Role = require('./role')(sequelize);
const UserRole = require('./userRole')(sequelize);
const Profile = require('./profile')(sequelize);
const Verification = require('./verification')(sequelize);
const OTP = require('./otp')(sequelize);
const RefreshToken = require('./refreshToken')(sequelize);
// const Connection = require('./connection')(sequelize); // COMMENTED: Connection management not needed yet

// Define associations
const setupAssociations = () => {
  // User <-> Profile (One-to-One)
  User.hasOne(Profile, { foreignKey: 'userId', as: 'profile' });
  Profile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // User <-> Verification (One-to-Many)
  User.hasMany(Verification, { foreignKey: 'userId', as: 'verifications' });
  Verification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // User <-> UserRole (Many-to-Many through UserRole)
  User.hasMany(UserRole, { foreignKey: 'userId', as: 'userRoles' });
  UserRole.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  Role.hasMany(UserRole, { foreignKey: 'roleId', as: 'userRoles' });
  UserRole.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

  // Admin User for Verification
  User.hasMany(Verification, { 
    foreignKey: 'verifiedBy', 
    as: 'verifiedDocuments' 
  });
  Verification.belongsTo(User, { 
    foreignKey: 'verifiedBy', 
    as: 'verifier' 
  });

  // User <-> RefreshToken (One-to-Many)
  User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
  RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // COMMENTED: Connection associations not needed yet
  // User <-> Connection (Many-to-Many self-referential)
  // User.hasMany(Connection, { foreignKey: 'requesterId', as: 'sentConnections' });
  // User.hasMany(Connection, { foreignKey: 'receiverId', as: 'receivedConnections' });
  // Connection.belongsTo(User, { foreignKey: 'requesterId', as: 'requester' });
  // Connection.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });
};

// Setup associations
setupAssociations();

// Export models and sequelize instance
module.exports = {
  sequelize,
  User,
  Role,
  UserRole,
  Profile,
  Verification,
  OTP,
  RefreshToken
  // Connection // COMMENTED: Not needed yet
};
