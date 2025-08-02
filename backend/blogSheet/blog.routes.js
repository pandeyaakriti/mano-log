//backend/journal/journal.routes.js
const express = require('express');
const router = express.Router();
const {
    createBlogEntry,
    getBlogEntries,
} = require('./blog.controller');

// POST /api/journal
router.post('/', createBlogEntry);

// GET /api/journal/:firebaseUid
router.get('/:firebaseUid', getBlogEntries);


module.exports = router;
