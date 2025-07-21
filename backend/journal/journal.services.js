//backend/journal/journal.services.js

require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const journalRoutes = require('./journal.routes');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT_WELLNESS || 3001;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('Connected to database via Prisma');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}
testConnection();

// Journal routes
app.use('/api/journal', journalRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Journal API OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Journal server running on port ${PORT}`);
});
