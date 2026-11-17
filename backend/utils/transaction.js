const mongoose = require('mongoose');

let transactionsSupportedCache = null;

/**
 * Executes an operation inside a MongoDB multi-document transaction when
 * supported (Atlas / Replica Set). On standalone MongoDB deployments where
 * transactions are unsupported (error code 20 / IllegalOperation), falls back
 * gracefully to non-transactional execution while invoking optional rollback.
 */
async function runWithTransaction(work, rollback = null) {
  if (transactionsSupportedCache === false) {
    try {
      return await work(null);
    } catch (err) {
      if (rollback) {
        try {
          await rollback();
        } catch (_) {
          // ignore rollback error
        }
      }
      throw err;
    }
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    transactionsSupportedCache = true;
    return result;
  } catch (err) {
    const isStandaloneTxError =
      err?.code === 20 ||
      err?.codeName === 'IllegalOperation' ||
      (typeof err?.message === 'string' &&
        (err.message.includes('Transaction numbers are only allowed on a replica set') ||
          err.message.includes('transactions are not supported')));

    if (isStandaloneTxError) {
      transactionsSupportedCache = false;
      try {
        return await work(null);
      } catch (fallbackErr) {
        if (rollback) {
          try {
            await rollback();
          } catch (_) {
            // ignore rollback error
          }
        }
        throw fallbackErr;
      }
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

module.exports = { runWithTransaction };
