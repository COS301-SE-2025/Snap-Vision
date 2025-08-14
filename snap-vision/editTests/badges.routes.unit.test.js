const express = require('express');
const request = require('supertest');

jest.mock('../../src/services/badgeService', () => ({
  unlockBadgeForUser: jest.fn().mockResolvedValue(),
  getUserBadgeData: jest.fn().mockResolvedValue({ points: 123, badges: ['x'] }),
  purchaseItemForUser: jest.fn().mockResolvedValue({ points: 45, purchases: [] }),
  completeChallengeForUser: jest
    .fn()
    .mockResolvedValue({ points: 67, completedChallenges: ['c1'] }),
  incrementRoutesCompletedForUser: jest.fn().mockResolvedValue({ routesCompleted: 5, badges: [] }),
}));

const {
  unlockBadgeForUser,
  getUserBadgeData,
  purchaseItemForUser,
  completeChallengeForUser,
  incrementRoutesCompletedForUser,
} = require('../../src/services/badgeService');

describe('Badges routes (unit)', () => {
  let app;

  beforeAll(() => {
    // Mount the router on a fresh Express app
    app = express();
    app.use(express.json());
    app.use('/api/badges', require('../../src/routes/badges'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('POST /unlock → 400 if missing body', async () => {
    await request(app).post('/api/badges/unlock').send({}).expect(400);
  });

  it('POST /unlock → 200 and returns getUserBadgeData payload', async () => {
    const payload = { uid: 'u1', badgeId: 'b1' };
    const res = await request(app).post('/api/badges/unlock').send(payload).expect(200);
    expect(unlockBadgeForUser).toHaveBeenCalledWith('u1', 'b1');
    expect(getUserBadgeData).toHaveBeenCalledWith('u1');
    expect(res.body).toEqual({ points: 123, badges: ['x'] });
  });

  it('GET /:uid → 200 returns user data', async () => {
    const res = await request(app).get('/api/badges/u2').expect(200);
    expect(getUserBadgeData).toHaveBeenCalledWith('u2');
    expect(res.body).toEqual({ points: 123, badges: ['x'] });
  });

  it('GET /:uid → 404 if no user', async () => {
    getUserBadgeData.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/badges/none').expect(404);
    expect(res.body.error).toBe('User not found');
  });

  it('POST /purchase → 400 if missing', async () => {
    await request(app).post('/api/badges/purchase').send({}).expect(400);
  });

  it('POST /purchase → 200 and returns purchaseItemForUser payload', async () => {
    const payload = { uid: 'u3', item: { cost: 1, itemId: 'i1' } };
    const res = await request(app).post('/api/badges/purchase').send(payload).expect(200);
    expect(purchaseItemForUser).toHaveBeenCalledWith('u3', payload.item);
    expect(res.body).toEqual({ points: 45, purchases: [] });
  });

  it('POST /challenges/complete → 400 if missing', async () => {
    await request(app).post('/api/badges/challenges/complete').send({}).expect(400);
  });

  it('POST /challenges/complete → 200 and returns completeChallengeForUser payload', async () => {
    const payload = { uid: 'u4', challengeId: 'c1' };
    const res = await request(app)
      .post('/api/badges/challenges/complete')
      .send(payload)
      .expect(200);
    expect(completeChallengeForUser).toHaveBeenCalledWith('u4', 'c1');
    expect(res.body).toEqual({ points: 67, completedChallenges: ['c1'] });
  });

  it('POST /increment-routes → 400 if missing uid', async () => {
    await request(app).post('/api/badges/increment-routes').send({}).expect(400);
  });

  it('POST /increment-routes → 200 and returns incrementRoutesCompletedForUser payload', async () => {
    const res = await request(app)
      .post('/api/badges/increment-routes')
      .send({ uid: 'u5' })
      .expect(200);
    expect(incrementRoutesCompletedForUser).toHaveBeenCalledWith('u5');
    expect(res.body).toEqual({ routesCompleted: 5, badges: [] });
  });
});
