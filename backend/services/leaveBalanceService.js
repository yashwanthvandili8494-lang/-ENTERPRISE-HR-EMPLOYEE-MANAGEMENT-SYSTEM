const LeaveBalance = require('../models/LeaveBalance');
const { getCompanySettings } = require('./settingsService');

async function ensureLeaveBalance(employeeId, year = new Date().getUTCFullYear(), session = null) {
  const query = LeaveBalance.findOne({ employee: employeeId, year });
  if (session) query.session(session);
  let balance = await query;

  if (!balance) {
    const settings = await getCompanySettings();
    const policies = settings.leavePolicies || {};
    const doc = {
      employee: employeeId,
      year,
      balances: {
        casual: { allocated: policies.casual ?? 12, used: 0, pending: 0 },
        sick: { allocated: policies.sick ?? 10, used: 0, pending: 0 },
        earned: { allocated: policies.earned ?? 15, used: 0, pending: 0 },
        unpaid: { allocated: policies.unpaid ?? 365, used: 0, pending: 0 },
        maternity: { allocated: policies.maternity ?? 90, used: 0, pending: 0 },
        paternity: { allocated: policies.paternity ?? 14, used: 0, pending: 0 },
      },
    };
    const created = session
      ? await LeaveBalance.create([doc], { session })
      : [await LeaveBalance.create(doc)];
    balance = created[0];
  }
  return balance;
}

module.exports = { ensureLeaveBalance };
