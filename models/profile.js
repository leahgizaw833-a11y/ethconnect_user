const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Profile = sequelize.define('Profile', {
    id: {
      type: DataTypes.STRING(36),
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      unique: true
    },
    fullName: {
      type: DataTypes.STRING(160)
    },
    bio: {
      type: DataTypes.TEXT
    },
    profession: {
      type: DataTypes.STRING(120)
    },
    languages: {
      type: DataTypes.JSON,
      comment: 'Array e.g., ["am", "en"]'
    },
    photoUrl: {
      type: DataTypes.STRING(500),
      comment: 'multer file URL'
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: true,
      comment: 'For matchmaking'
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'For matchmaking'
    },
    religion: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'For matchmaking'
    },
    ethnicity: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'For matchmaking'
    },
    education: {
      type: DataTypes.STRING(120),
      allowNull: true,
      comment: 'For matchmaking/teachers'
    },
    interests: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'For matchmaking'
    },
    ratingAvg: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.00
    },
    ratingCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    verificationStatus: {
      type: DataTypes.ENUM('none', 'kyc', 'professional', 'full'),
      defaultValue: 'none',
      comment: 'Granular verification level'
    }
  }, {
    tableName: 'profiles',
    timestamps: true
  });

  return Profile;
};
