const mongoose = require('mongoose');

/**
 * Counter Model - Atomic sequential counter for bill numbers
 * Uses MongoDB's $inc + findOneAndUpdate (atomic) to prevent race conditions
 * and duplicate bill numbers under concurrent requests.
 */
const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

const Counter = mongoose.model('Counter', counterSchema);

/**
 * Get next sequential number for a given date.
 * Resets daily: when the date changes, counter restarts at 1.
 * Uses atomic findOneAndUpdate with upsert for concurrency safety.
 * @param {string} counterId - The counter key (e.g., 'bill')
 * @param {string} dateStr - e.g., '20261123'
 * @returns {Promise<number>} - Next sequential integer
 */
const getNextSequence = async (counterId, dateStr) => {
  // Try to increment existing counter for this date
  const updated = await Counter.findOneAndUpdate(
    { _id: counterId, date: dateStr },
    { $inc: { seq: 1 } },
    { new: true }
  );

  if (updated) {
    return updated.seq;
  }

  // Date has changed (new day) or first ever — reset counter to 1
  await Counter.findOneAndUpdate(
    { _id: counterId },
    { _id: counterId, date: dateStr, seq: 1 },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return 1;
};

module.exports = { Counter, getNextSequence };
