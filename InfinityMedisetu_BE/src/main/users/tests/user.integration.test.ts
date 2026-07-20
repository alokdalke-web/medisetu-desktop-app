import request from 'supertest';
import express from 'express';
import { UserService } from '../services/user.service';
import userRouter from '../routes/v1/users.route';
import { errorHandler } from '../../../middlewear/errorHandler';

// Mock the service
jest.mock('../services/user.service');

// Mock otplib to avoid ESM parsing issues with @scure/base
jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verify: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api/v1/users', userRouter);
app.use(errorHandler);

describe('User Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/users/request-registration', () => {
    it('should return 200 and success message when registration requested', async () => {
      (
        UserService.requestRegistrationVerification as jest.Mock
      ).mockResolvedValue({
        message: 'OTP sent to your email',
      });

      const response = await request(app)
        .post('/api/v1/users/request-registration')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'OTP sent to your email',
      });
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/users/request-registration')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/users/login', () => {
    it('should return 200 and token on successful login', async () => {
      const mockResult = {
        user: { id: '1', email: 'test@example.com' },
        token: 'mock_jwt_token',
      };
      (UserService.login as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/users/login')
        .send({ email: 'test@example.com', password: 'Password123!' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        user: mockResult.user,
        token: mockResult.token,
      });
    });

    it('should return 200 with mfaRequired when MFA is enabled', async () => {
      const mockResult = {
        mfaRequired: true,
        tempToken: 'mock_mfa_temp_token',
      };
      (UserService.login as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/users/login')
        .send({ email: 'test@example.com', password: 'Password123!' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        mfaRequired: true,
        tempToken: 'mock_mfa_temp_token',
      });
    });
  });
});
