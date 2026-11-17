/**
 * Secure Initial Super Administrator Setup Script
 * Usage:
 *   ADMIN_EMAIL=admin@yourcompany.com ADMIN_PASSWORD=StrongPassword123! ADMIN_NAME="System Admin" npm run setup:admin
 */
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Department = require('../models/Department');
const CompanySettings = require('../models/CompanySettings');
const { DEFAULT_DEPARTMENTS, ROLES } = require('../utils/constants');

async function setupAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Super Administrator';

  if (!email || !password || password.length < 8) {
    console.error(
      'ERROR: Provide ADMIN_EMAIL and ADMIN_PASSWORD (min 8 chars) via environment variables.\n' +
        'Example: ADMIN_EMAIL=admin@company.com ADMIN_PASSWORD=YourSecurePassword! npm run setup:admin'
    );
    process.exit(1);
  }

  await connectDB();

  // Ensure singleton company settings exist
  await CompanySettings.findOneAndUpdate(
    { singletonKey: 'PRIMARY_COMPANY_SETTINGS' },
    { $setOnInsert: { singletonKey: 'PRIMARY_COMPANY_SETTINGS' } },
    { upsert: true, new: true }
  );

  // Ensure default departments exist
  for (const dept of DEFAULT_DEPARTMENTS) {
    await Department.findOneAndUpdate(
      { code: dept.code },
      { $setOnInsert: dept },
      { upsert: true, new: true }
    );
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log(`User ${email} already exists with role ${existing.role}. No changes made.`);
  } else {
    await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: ROLES.SUPER_ADMIN,
      isActive: true,
    });
    console.log(`Super Admin account created successfully for ${email}.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

setupAdmin().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
