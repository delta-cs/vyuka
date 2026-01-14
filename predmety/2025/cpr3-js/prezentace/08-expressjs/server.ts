// =============================================================================
// Express.js - TypeScript Examples
// =============================================================================

import express, { Request, Response, NextFunction } from 'express';

const app = express();

// =============================================================================
// Types and Interfaces
// =============================================================================

interface User {
  id: number;
  name: string;
  email: string;
}

interface CreateUserBody {
  name: string;
  email: string;
}

interface UserParams {
  id: string;
}

interface SearchQuery {
  q?: string;
  limit?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AuthRequest extends Request {
  userId?: string;
}

interface RateLimitStore {
  [ip: string]: {
    count: number;
    resetTime: number;
  };
}

// =============================================================================
// Custom Error Classes
// =============================================================================

class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

class NotFoundError extends HttpError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

class ValidationError extends HttpError {
  constructor(message: string) {
    super(400, message);
    this.name = 'ValidationError';
  }
}

class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

// =============================================================================
// Async Handler Wrapper
// =============================================================================

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// =============================================================================
// Response Helpers
// =============================================================================

function sendSuccess<T>(res: Response, data: T, status = 200) {
  const response: ApiResponse<T> = {
    success: true,
    data
  };
  res.status(status).json(response);
}

function sendError(res: Response, error: string, status = 400) {
  const response: ApiResponse<null> = {
    success: false,
    error
  };
  res.status(status).json(response);
}

// =============================================================================
// Validation
// =============================================================================

function validateUser(body: any): body is CreateUserBody {
  return (
    typeof body.name === 'string' &&
    typeof body.email === 'string' &&
    body.email.includes('@')
  );
}

function validateBody<T>(validator: (body: any) => body is T) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!validator(req.body)) {
      return res.status(400).json({
        error: 'Validation failed'
      });
    }
    next();
  };
}

// =============================================================================
// Runtime Type Conversion (Query/Route Params)
// =============================================================================

// Query and route params are ALWAYS strings at runtime,
// regardless of TypeScript types!

function parseIntSafe(
  value: string | undefined,
  defaultValue: number
): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseBoolSafe(
  value: string | undefined,
  defaultValue: boolean
): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

// Example: Dangerous - no validation
app.get('/users-dangerous', (req: Request, res: Response) => {
  const limit = req.query.limit; // string | undefined

  // Dangerous! parseInt('abc') === NaN
  const limitNum = parseInt(limit as string);

  // NaN will cause problems later in code
  // const users = await db.users.limit(limitNum);
  res.json({ limit: limitNum }); // Could be NaN!
});

// Example: Safe - with validation
app.get('/users-safe', (req: Request, res: Response) => {
  const limit = parseIntSafe(req.query.limit as string, 10);
  const offset = parseIntSafe(req.query.offset as string, 0);
  const active = parseBoolSafe(req.query.active as string, true);

  // limit and offset are always valid numbers
  res.json({ limit, offset, active });
});

// Example: Route param validation
app.get('/user/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      error: 'Invalid ID format'
    });
  }

  // id is now a valid positive number
  res.json({ userId: id });
});

// =============================================================================
// Middleware - Logger
// =============================================================================

function logger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ` +
      `${req.method} ${req.path} ` +
      `${res.statusCode} ${duration}ms`
    );
  });

  next();
}

// =============================================================================
// Middleware - Authentication
// =============================================================================

function verifyToken(token: string): { userId: string } {
  // Simplified token verification
  if (token === 'valid-token') {
    return { userId: '123' };
  }
  throw new Error('Invalid token');
}

function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'No token provided'
    });
  }

  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({
      error: 'Invalid token'
    });
  }
}

// =============================================================================
// Middleware - Rate Limiter
// =============================================================================

const rateLimitStore: RateLimitStore = {};

function rateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();

    if (!rateLimitStore[ip] || rateLimitStore[ip].resetTime < now) {
      rateLimitStore[ip] = {
        count: 1,
        resetTime: now + windowMs
      };
      return next();
    }

    rateLimitStore[ip].count++;

    if (rateLimitStore[ip].count > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests'
      });
    }

    next();
  };
}

// =============================================================================
// Middleware - Error Handler
// =============================================================================

function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(`[ERROR] ${err.name}: ${err.message}`);

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
  }

  // Unknown error
  res.status(500).json({
    success: false,
    error: 'Internal Server Error'
  });
}

// =============================================================================
// In-Memory Database
// =============================================================================

let users: User[] = [];
let nextId = 1;

// =============================================================================
// Apply Middleware
// =============================================================================

app.use(express.json());
app.use(logger);
// app.use(rateLimiter(100, 15 * 60 * 1000)); // 100 requests per 15 minutes

// =============================================================================
// Routes - Basic
// =============================================================================

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Hello World!' });
});

// =============================================================================
// Routes - Users CRUD
// =============================================================================

// GET all users
app.get('/api/users', (req: Request, res: Response) => {
  sendSuccess(res, users);
});

// GET user by ID
app.get('/api/users/:id', (req: Request<UserParams>, res: Response) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) {
    return sendError(res, 'User not found', 404);
  }
  sendSuccess(res, user);
});

// POST create user
app.post(
  '/api/users',
  validateBody(validateUser),
  (req: Request<{}, {}, CreateUserBody>, res: Response) => {
    const { name, email } = req.body;
    const user: User = { id: nextId++, name, email };
    users.push(user);
    sendSuccess(res, user, 201);
  }
);

// PUT update user
app.put('/api/users/:id', (req: Request<UserParams>, res: Response) => {
  const id = parseInt(req.params.id);
  const index = users.findIndex(u => u.id === id);
  if (index === -1) {
    return sendError(res, 'User not found', 404);
  }
  users[index] = { ...users[index], ...req.body };
  sendSuccess(res, users[index]);
});

// DELETE user
app.delete('/api/users/:id', (req: Request<UserParams>, res: Response) => {
  const id = parseInt(req.params.id);
  const index = users.findIndex(u => u.id === id);
  if (index === -1) {
    return sendError(res, 'User not found', 404);
  }
  const deleted = users.splice(index, 1)[0];
  sendSuccess(res, deleted);
});

// =============================================================================
// Routes - Search with Query Parameters
// =============================================================================

app.get('/api/search', (
  req: Request<{}, {}, {}, SearchQuery>,
  res: Response
) => {
  const { q, limit = '10' } = req.query;
  res.json({ query: q, limit });
});

// =============================================================================
// Routes - Protected
// =============================================================================

app.get('/api/profile', authenticate, (req: AuthRequest, res: Response) => {
  res.json({ userId: req.userId });
});

// =============================================================================
// Routes - Async with Error Handling
// =============================================================================

async function findUserById(id: string): Promise<User | undefined> {
  // Simulate async database lookup
  return users.find(u => u.id === parseInt(id));
}

app.get('/api/async/users/:id', asyncHandler(async (req, res) => {
  const user = await findUserById(req.params.id);
  if (!user) {
    throw new NotFoundError('User');
  }
  res.json(user);
}));

// =============================================================================
// Error handler must be last!
// =============================================================================

app.use(errorHandler);

// =============================================================================
// Start Server
// =============================================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
