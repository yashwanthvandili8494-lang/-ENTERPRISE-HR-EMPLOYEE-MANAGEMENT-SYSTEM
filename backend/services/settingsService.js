const CompanySettings = require('../models/CompanySettings');

async function getCompanySettings() {
  let settings = await CompanySettings.findOne({ singletonKey: 'PRIMARY_COMPANY_SETTINGS' });
  if (!settings) {
    settings = await CompanySettings.create({ singletonKey: 'PRIMARY_COMPANY_SETTINGS' });
  }
  return settings;
}

module.exports = { getCompanySettings };
