// API contract tests — these exercise validation, authentication, and routing,
// all of which resolve before any database access, so they need no live DB.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key';
process.env.GATE_API_KEY = 'test_gate_key';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');

const userToken = jwt.sign({ userId: 1, email: 'u@x.com' }, process.env.JWT_SECRET, { expiresIn: '1h' });

test('GET /api/health returns ok', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('unknown /api route returns 404 JSON', async () => {
  const res = await request(app).get('/api/does-not-exist');
  assert.equal(res.status, 404);
  assert.ok(res.body.error);
});

test('register requires all fields', async () => {
  const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com' });
  assert.equal(res.status, 400);
});

test('register rejects a password shorter than 8 chars', async () => {
  const res = await request(app).post('/api/auth/register')
    .send({ firstName: 'A', lastName: 'B', email: 'a@b.com', phone: '123', password: 'short' });
  assert.equal(res.status, 400);
});

test('login requires email and password', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });
  assert.equal(res.status, 400);
});

test('protected route rejects a missing token', async () => {
  const res = await request(app).get('/api/vehicles');
  assert.equal(res.status, 401);
});

test('protected route rejects an invalid token', async () => {
  const res = await request(app).get('/api/wallet/balance').set('Authorization', 'Bearer not-a-token');
  assert.equal(res.status, 403);
});

test('gate-trigger rejects a missing device key', async () => {
  const res = await request(app).post('/api/toll/gate-trigger').send({ licencePlate: 'ABC 123 ZM', gateId: 1 });
  assert.equal(res.status, 401);
});

test('gate-trigger rejects a wrong device key', async () => {
  const res = await request(app).post('/api/toll/gate-trigger')
    .set('x-gate-key', 'wrong-key').send({ licencePlate: 'ABC 123 ZM', gateId: 1 });
  assert.equal(res.status, 401);
});

test('admin route rejects a missing token', async () => {
  const res = await request(app).get('/api/admin/dashboard');
  assert.equal(res.status, 401);
});

test('admin route rejects a non-admin (user) token', async () => {
  const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${userToken}`);
  assert.equal(res.status, 403);
});

test('top-up enforces the minimum amount', async () => {
  const res = await request(app).post('/api/wallet/topup')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ amount: 5, provider: 'MTN_Money', phoneNumber: '0977000000' });
  assert.equal(res.status, 400);
});

test('top-up rejects an invalid mobile-money provider', async () => {
  const res = await request(app).post('/api/wallet/topup')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ amount: 100, provider: 'NotAProvider', phoneNumber: '0977000000' });
  assert.equal(res.status, 400);
});

test('adding a vehicle requires all fields', async () => {
  const res = await request(app).post('/api/vehicles')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ make: 'Toyota' });
  assert.equal(res.status, 400);
});
