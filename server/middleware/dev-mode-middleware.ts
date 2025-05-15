import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check for developer mode cookies and 
 * add them as headers if present for downstream use
 */
export const checkDevMode = (req: Request, res: Response, next: NextFunction) => {
  // Check for developer mode cookies
  const cookies = req.headers.cookie || '';
  const cookieMap = cookies.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, string>);

  // Add headers if dev mode is active
  if (cookieMap['dev_mode'] === 'true') {
    req.headers['x-dev-mode'] = 'true';
    
    // Only set tier if it's one of our valid tiers
    const devTier = cookieMap['dev_tier'];
    if (devTier && ['free', 'personal', 'pro', 'instant'].includes(devTier)) {
      req.headers['x-dev-tier'] = devTier;
      console.log(`Developer mode active: Using tier ${devTier} for testing`);
    }
  }

  next();
};