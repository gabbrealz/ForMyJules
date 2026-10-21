import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Basic Route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Hello, TypeScript + Express!' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
