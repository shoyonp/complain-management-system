// Tests declare their own environment so they never read a developer's .env.
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
