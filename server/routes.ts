import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analysisController } from "./controllers/analysis-controller";

export async function registerRoutes(app: Express): Promise<Server> {
  // Handle analysis routes
  app.post('/api/analyze/chat', analysisController.analyzeChat);
  app.post('/api/analyze/message', analysisController.analyzeMessage);
  app.post('/api/analyze/vent', analysisController.ventMessage);
  app.post('/api/analyze/detect-names', analysisController.detectNames);
  app.post('/api/ocr', analysisController.processOcr);
  
  // Get user usage data
  app.get('/api/user/usage', async (req, res) => {
    // This is a simple stub that returns default free tier usage
    // In a real app, we would get this from user authentication
    
    // For demo purposes, we're returning mock data since we don't have real auth
    const tier = 'free';
    const used = 0;
    const limit = 1;
    
    res.json({ tier, used, limit });
  });
  
  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
