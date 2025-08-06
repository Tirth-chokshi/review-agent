import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import authRoutes from "./routes/auth.js";
import apiRoutes from "./routes/api.js";
import reviewsRoutes from "./routes/reviews.js";
import analysisRoutes from "./routes/analysis.js";
import {
  jsonErrorHandler,
  notFoundHandler,
} from "./middleware/errorHandler.js";
// Removed MySQL session store import - using default memory store

dotenv.config();

const app = express();
const PORT = 8000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:3000"], 
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    // Using default memory store (fine for development)
    // store: sessionStore, // Removed MySQL store
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
    },
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/analysis", analysisRoutes);

// Root route - redirect to health check
app.get("/", (req, res) => {
  res.json({
    message: "Google My Business Auth Backend with AI Analysis",
    status: "running",
    endpoints: {
      health: "/health",
      auth: "/api/auth/google",
      data: "/api/data",
      reviews: "/api/reviews",
      analysis: "/api/analysis/analyze",
      stats: "/api/analysis/stats",
      testAI: "/api/analysis/test",
    },
  });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const stats = await ReviewAnalysisDB.getStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// 404 handler for unmatched routes (must come before error handler)
app.use(notFoundHandler);

// Comprehensive JSON error handling middleware
app.use(jsonErrorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
