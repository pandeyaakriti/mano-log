//backend/journal/journal.services.js

require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const journalRoutes = require('./blog.routes');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT_ROOT || 5000;


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
app.use('/api/blog', blogRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Blog API OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`blog server running on port ${PORT}`);
});
