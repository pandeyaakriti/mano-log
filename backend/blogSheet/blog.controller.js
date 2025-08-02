//backend/journal/journal.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new journal entry
exports.createBlogEntry = async (req, res) => {
  try {
    console.log(' Received blog entry request');
    const { firebaseUid, textContent, tags = [] } = req.body;
    console.log('Received data:', { firebaseUid, textContent });
    if (!firebaseUid || !textContent) {
      return res.status(400).json({ error: 'firebaseUid and textContent are required.' });
    }

    // Find user by firebaseUid
    const user = await prisma.user.findUnique({
      where: { firebaseUid },
      select: {
        id: true,
        email: true,
        displayName: true,
        firebaseUid: true
      }

    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    console.log(' User found:', { 
      userId: user.id, 
      email: user.email,
      displayName: user.displayName 
    });

    const wordCount = textContent.trim().split(/\s+/).filter(word => word.length > 0).length;

   // Create journal entry
    const blogData = {
      textContent: textContent.trim(),
      userId: user.id,
      entryDate: new Date(),
      wordCount,
      tags: Array.isArray(tags) ? tags : [],
    };

    console.log(' Creating blog entry with data:', {
      ...blogData,
      textContent: `${blogData.textContent.substring(0, 50)}...`
    });

    const blog = await prisma.blogEntry.create({
      data: blogData,
      include: {
        user: {
          select: {
            email: true,
            displayName: true
          }
        }
      }
    });

    console.log(' blog entry created successfully:', {
      id: blog.id,
      userId: blog.userId,
      wordCount: blog.wordCount,
      entryDate: blog.entryDate
    });

    res.status(201).json({ 
      message: 'blog saved successfully!', 
      success: true,
      blog: {
        id: blog.id,
        textContent: blog.textContent,
        entryDate: blog.entryDate,
        wordCount: blog.wordCount,
        tags: blog.tags,
        user: {
          email: blog.user.email,
          displayName: blog.user.displayName
        }
      }
    });

  } catch (error) {
    console.error(' Error in createBlogEntry:', error);
    console.error(' Error stack:', error.stack);
    
    // Check if it's a Prisma error
    if (error.code) {
      console.error(' Prisma error code:', error.code);
      console.error(' Prisma error meta:', error.meta);
    }

    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get blog entries for a user
exports.getBlogEntries = async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    if (!firebaseUid) return res.status(400).json({ error: 'firebaseUid is required.' });

    const user = await prisma.user.findUnique({
      where: { firebaseUid },
      select: {
        id: true,
        email: true,
        displayName: true
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const entries = await prisma.blogEntry.findMany({
      where: { userId: user.id },
      orderBy: { entryDate: 'desc' },
       include: {
        user: {
          select: {
            email: true,
            displayName: true
          }
        }
      }
    });
    console.log(` Found ${entries.length} blogsheet entries for user`);
    
    res.status(200).json({
      success: true,
      count: entries.length,
      entries
    });
  } catch (error) {
    console.error('Error fetching blogsheet entries:', error);
    res.status(500).json({ error: 'Internal server error', details: error
      .message});
  }
};
