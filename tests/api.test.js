const request = require('supertest');
const app = require('../server');

describe('Shopee API Endpoints', () => {
  describe('GET /api/shopee/auth-url', () => {
    it('should return auth URL', async () => {
      const response = await request(app)
        .get('/api/shopee/auth-url')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authUrl).toBeDefined();
    });
  });

  describe('GET /api/shopee/callback', () => {
    it('should return error without code', async () => {
      const response = await request(app)
        .get('/api/shopee/callback')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
});

describe('Sync Service Endpoints', () => {
  describe('POST /api/sync/all/:shopId', () => {
    it('should return error if shop not found', async () => {
      const response = await request(app)
        .post('/api/sync/all/invalid-shop-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});

describe('Health Check', () => {
  it('should return ok status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
  });
});

describe('Authentication Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('should return error without email or password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return error without email or password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return error without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
