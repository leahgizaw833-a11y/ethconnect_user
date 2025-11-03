const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Verification = sequelize.define('Verification', {
    id: {
      type: DataTypes.STRING(36),
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('kyc', 'doctor_license', 'teacher_cert', 'business_license', 'employer_cert', 'other'),
      allowNull: false
    },
    documentUrl: {
      type: DataTypes.STRING(500),
      comment: 'Uploaded doc URL'
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    notes: {
      type: DataTypes.TEXT
    },
    verifiedBy: {
      type: DataTypes.STRING(36),
      comment: 'Admin ID'
    },
    verifiedAt: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'verifications',
    timestamps: true,
    indexes: [
      { fields: ['userId', 'type'] },
      { fields: ['status'] }
    ]
  });

  return Verification;
};
