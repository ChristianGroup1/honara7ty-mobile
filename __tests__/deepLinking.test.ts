jest.mock('../lib/supbase', () => ({
  __esModule: true,
  default: {
    auth: {
      exchangeCodeForSession: jest.fn(),
      setSession: jest.fn(),
    },
  },
}));

import { handleRecoveryUrl, parseFragment } from '../lib/deepLinking';
import supabase from '../lib/supbase';

describe('deepLinking', () => {
  const mockExchangeCodeForSession =
    supabase.auth.exchangeCodeForSession as jest.Mock;
  const mockSetSession = supabase.auth.setSession as jest.Mock;

  beforeEach(() => {
    mockExchangeCodeForSession.mockReset();
    mockSetSession.mockReset();
  });

  it('parses fragment pairs', () => {
    expect(parseFragment('type=recovery&access_token=a%20b')).toEqual({
      type: 'recovery',
      access_token: 'a b',
    });
  });

  it('exchanges the recovery code when it arrives in the query string', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    await expect(
      handleRecoveryUrl('honara7ty://reset-password?code=abc123'),
    ).resolves.toEqual({
      isRecovery: true,
      isValid: true,
    });

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('abc123');
  });

  it('accepts recovery tokens when they arrive in the hash fragment', async () => {
    mockSetSession.mockResolvedValue({ error: null });

    await expect(
      handleRecoveryUrl(
        'honara7ty://reset-password#type=recovery&access_token=token&refresh_token=refresh',
      ),
    ).resolves.toEqual({
      isRecovery: true,
      isValid: true,
    });

    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'token',
      refresh_token: 'refresh',
    });
  });

  it('accepts recovery tokens when they arrive in the query string', async () => {
    mockSetSession.mockResolvedValue({ error: null });

    await expect(
      handleRecoveryUrl(
        'honara7ty://reset-password?type=recovery&access_token=token&refresh_token=refresh',
      ),
    ).resolves.toEqual({
      isRecovery: true,
      isValid: true,
    });

    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'token',
      refresh_token: 'refresh',
    });
  });

  it('marks the reset link as invalid when Supabase returns an error parameter', async () => {
    await expect(
      handleRecoveryUrl(
        'honara7ty://reset-password?error=access_denied&error_code=otp_expired',
      ),
    ).resolves.toEqual({
      isRecovery: true,
      isValid: false,
    });
  });
});
