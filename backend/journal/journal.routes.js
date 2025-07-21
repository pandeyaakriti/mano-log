//backend/journal/journal.routes.js

const express = require('express');
const router = express.Router();
const {
  createJournalEntry,
  getJournalEntries,
} = require('./journal.controller');

// POST /api/journal
router.post('/', createJournalEntry);

// GET /api/journal/:firebaseUid
router.get('/:firebaseUid', getJournalEntries);

module.exports = router;
