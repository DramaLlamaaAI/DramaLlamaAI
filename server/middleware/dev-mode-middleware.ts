import { Request, Response, NextFunction } from 'express';

/**
 * This middleware is now a simple passthrough since developer mode has been removed.
 * We keep the function definition to maintain compatibility with existing imports.
 */
export const checkDevMode = (req: Request, res: Response, next: NextFunction) => {
  // Developer mode has been removed
  next();
};