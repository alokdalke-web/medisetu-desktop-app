import { UserService } from '../services/user.service';
import { database } from '../../../configurations/dbConnection';
import { HttpError } from '../../../middlewear/errorHandler';
import * as authUtils from '../../../utils/authUtils';
import { sendEmail } from '../../../utils/email';

// Mock dependencies
jest.mock('../../../configurations/dbConnection');
jest.mock('../../../utils/authUtils');
jest.mock('../../../utils/email');
jest.mock('../../../utils/logger');
jest.mock('../../mfa/services/mfa.service', () => ({
  MfaService: {
    isMfaEnabled: jest.fn(),
  },
}));

// Import after mock setup
import { MfaService } from '../../mfa/services/mfa.service';

describe('UserService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sendEmail as jest.Mock).mockReturnValue({
      catch: jest.fn().mockResolvedValue({}),
    });
  });

  describe('requestRegistrationVerification', () => {
    it('should throw error if email is already in use', async () => {
      (database.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 1 }]),
          }),
        }),
      });

      await expect(
        UserService.requestRegistrationVerification('test@example.com')
      ).rejects.toThrow(new HttpError(400, 'Email already in use'));
    });

    it('should send OTP if email is available', async () => {
      (database.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      (database.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockResolvedValue({}),
        }),
      });

      (authUtils.generateOTP as jest.Mock).mockReturnValue('123456');
      (authUtils.hashToken as jest.Mock).mockReturnValue('hashed_otp');

      const result =
        await UserService.requestRegistrationVerification('test@example.com');

      expect(result).toEqual({ message: 'OTP sent to your email' });
      expect(database.insert).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should throw 401 for invalid email', async () => {
      (database.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        UserService.login('wrong@example.com', 'password')
      ).rejects.toThrow(new HttpError(401, 'Invalid credentials'));
    });

    it('should return user and token for valid credentials', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed_password',
        isEmailVerified: true,
        userStatus: 'Active',
      };

      (database.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });

      (authUtils.comparePassword as jest.Mock).mockResolvedValue(true);
      (authUtils.signJwt as jest.Mock).mockReturnValue('mock_token');
      (MfaService.isMfaEnabled as jest.Mock).mockResolvedValue(false);

      const result = await UserService.login('test@example.com', 'password');

      expect(result).toHaveProperty('token', 'mock_token');
      expect((result as any).user.email).toBe('test@example.com');
    });

    it('should return mfaRequired and tempToken when MFA is enabled', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed_password',
        isEmailVerified: true,
        userStatus: 'Active',
      };

      (database.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });

      (authUtils.comparePassword as jest.Mock).mockResolvedValue(true);
      (authUtils.signMfaTempToken as jest.Mock).mockReturnValue(
        'mock_mfa_temp_token'
      );
      (MfaService.isMfaEnabled as jest.Mock).mockResolvedValue(true);

      const result = await UserService.login('test@example.com', 'password');

      expect(result).toEqual({
        mfaRequired: true,
        tempToken: 'mock_mfa_temp_token',
      });
      expect(authUtils.signMfaTempToken).toHaveBeenCalledWith('1');
      expect(authUtils.signJwt).not.toHaveBeenCalled();
    });
  });
});
