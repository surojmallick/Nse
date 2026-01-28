import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import scanRoutes from './routes/scan.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/scan', scanRoutes);

// Static files are handled by Vercel's CDN in production,
// but we keep this for local 'npm start' behavior or specific setups.
app.use(express.static(path.join(__dirname, 'dist'))); // Changed from public to dist to match Vite config

// Catch-all for SPA (Only active when running locally as a standalone server)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Conditional listener: Only listen if run directly (node server.js)
// This prevents Vercel from trying to bind a port when importing the app as a serverless function
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;