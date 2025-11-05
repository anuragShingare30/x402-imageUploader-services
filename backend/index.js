require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { paymentMiddleware } = require('x402-express');

const app = express();
const PORT = process.env.PORT || 3001;

// Environment validation
const facilitatorUrl = process.env.FACILITATOR_URL;
const payTo = process.env.ADDRESS;
const network = process.env.NETWORK || 'base-sepolia';

if (!facilitatorUrl || !payTo) {
  console.error('Missing required environment variables: FACILITATOR_URL and ADDRESS must be set');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// Supabase client setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Multer setup for handling file uploads (in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Apply x402 payment middleware for upload endpoint
app.use(
  paymentMiddleware(
    payTo,
    {
      'POST /upload': {
        price: '$0.0001',
        network,
        config: {
          description: 'Upload image to storage'
        }
      }
    },
    {
      url: facilitatorUrl
    }
  )
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'x402 Image Uploader Service is running',
    timestamp: new Date().toISOString()
  });
});

// Get all uploaded images (optional endpoint for viewing uploads)
app.get('/images', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch images' });
    }

    res.json({ images: data });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected upload endpoint with x402 payment
app.post('/upload', 
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const file = req.file;
      const fileName = `${Date.now()}-${file.originalname}`;
      const filePath = `uploads/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(process.env.STORAGE_BUCKET)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          duplex: 'half'
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return res.status(500).json({ error: 'Failed to upload image to storage' });
      }

      // Get the public URL for the uploaded image
      const { data: urlData } = supabase.storage
        .from(process.env.STORAGE_BUCKET)
        .getPublicUrl(filePath);

      // Save metadata to database
      const imageRecord = {
        user_address: req.headers['x-user-address'] || null, // Optional user identification
        path: filePath,
        mime: file.mimetype,
        uploaded_at: new Date().toISOString(),
        public_url: urlData.publicUrl,
        file_size: file.size,
        original_name: file.originalname
      };

      const { data: dbData, error: dbError } = await supabase
        .from('images')
        .insert([imageRecord])
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        // Even if DB insert fails, the file was uploaded successfully
        return res.status(201).json({
          message: 'Image uploaded successfully (metadata save failed)',
          url: urlData.publicUrl,
          path: filePath
        });
      }

      // Success response
      res.status(201).json({
        message: 'Image uploaded successfully',
        id: dbData.id,
        url: urlData.publicUrl,
        path: filePath,
        uploadedAt: dbData.uploaded_at
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Internal server error during upload' });
    }
  }
);

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({ error: 'Only image files are allowed' });
  }

  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`x402 Image Uploader Service running on port ${PORT}`);
  console.log(`Accepting payments to: ${payTo}`);
  console.log(`Network: ${network}`);
  console.log(`Facilitator: ${facilitatorUrl}`);
  console.log(`Endpoints:`);
  console.log(`  - Health check: http://localhost:${PORT}/health`);
  console.log(`  - Upload (protected): http://localhost:${PORT}/upload`);
  console.log(`  - Images list: http://localhost:${PORT}/images`);
  console.log(`Payment required: $0.0001 per upload`);
});

module.exports = app;