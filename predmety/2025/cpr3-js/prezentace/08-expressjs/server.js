// =============================================================================
// Express.js - JavaScript Examples
// =============================================================================

const express = require('express');
const app = express();

// =============================================================================
// Built-in Middleware
// =============================================================================

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies (forms)
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' folder
app.use(express.static('public'));

// =============================================================================
// Custom Middleware - Logger
// =============================================================================

function logger(req, res, next) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
}

app.use(logger);

// =============================================================================
// Custom Middleware - Authentication
// =============================================================================

function authenticate(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  // Verify token...
  next();
}

// =============================================================================
// Error Handler Middleware
// =============================================================================

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[ERROR] ${status}: ${message}`);

  res.status(status).json({
    error: message,
    status: status
  });
}

// =============================================================================
// Basic Routes
// =============================================================================

// Hello World
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// =============================================================================
// CRUD Routes for Users
// =============================================================================

// GET - retrieve data
app.get('/users', (req, res) => {
  res.send('Get all users');
});

// POST - create data
app.post('/users', (req, res) => {
  console.log(req.body);
  res.send('Create user');
});

// GET user by ID (route parameters)
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  res.send('User ID: ' + userId);
});

// PUT - update data
app.put('/users/:id', (req, res) => {
  console.log(req.body);
  res.send('Update user ' + req.params.id);
});

// DELETE - delete data
app.delete('/users/:id', (req, res) => {
  res.send('Delete user ' + req.params.id);
});

// =============================================================================
// Query Parameters
// =============================================================================

app.get('/search', (req, res) => {
  const query = req.query.q;
  const limit = req.query.limit || 10;
  res.send('Searching for: ' + query);
});

// =============================================================================
// Response Examples
// =============================================================================

app.get('/examples/text', (req, res) => {
  // Text response
  res.send('Hello World');
});

app.get('/examples/json', (req, res) => {
  // JSON response
  res.json({ message: 'Hello', status: 'ok' });
});

app.get('/examples/status', (req, res) => {
  // Status code with response
  res.status(201).json({ id: 1, name: 'John' });
});

app.get('/examples/redirect', (req, res) => {
  // Redirect
  res.redirect('/');
});

// =============================================================================
// Protected Route Example
// =============================================================================

app.get('/admin', authenticate, (req, res) => {
  res.send('Admin panel');
});

// =============================================================================
// Route with Error Handling
// =============================================================================

// Simulated user database
const users = [
  { id: 1, name: 'John' },
  { id: 2, name: 'Jane' }
];

function findUser(id) {
  return users.find(u => u.id === parseInt(id));
}

app.get('/api/users/:id', (req, res, next) => {
  const user = findUser(req.params.id);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    return next(error); // Pass error to error handler
  }
  res.json(user);
});

// =============================================================================
// Error handler must be last!
// =============================================================================

app.use(errorHandler);

// =============================================================================
// Start Server
// =============================================================================

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
