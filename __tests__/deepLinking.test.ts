jest.mock('../lib/supbase', () => ({
  __esModule: true,
  default: {
    auth: {
      exchangeCodeForSession: jest.fn(),
      setSession: jest.fn(),
    },
  },
}));

import {
  getDevotionGroupInviteCodeFromUrl,
  handleRecoveryUrl,
  parseFragment,
} from '../lib/deepLinking';
import supabase from '../lib/supbase';
import {
  __resetOAuthCallbackCacheForTests,
  handleOAuthCallbackUrl,
} from '../lib/deepLinking';

describe('deepLinking', () => {
  const mockExchangeCodeForSession =
    supabase.auth.exchangeCodeForSession as jest.Mock;
  const mockSetSession = supabase.auth.setSession as jest.Mock;

  beforeEach(() => {
    mockExchangeCodeForSession.mockReset();
    mockSetSession.mockReset();
    __resetOAuthCallbackCacheForTests();
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

  it('exchanges the OAuth code when it arrives on the auth callback URL', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    await expect(
      handleOAuthCallbackUrl('honara7ty://auth-callback?code=facebook-code'),
    ).resolves.toBe(true);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('facebook-code');
  });

  it('accepts OAuth tokens when they arrive on the auth callback URL', async () => {
    mockSetSession.mockResolvedValue({ error: null });

    await expect(
      handleOAuthCallbackUrl(
        'honara7ty://auth-callback#access_token=token&refresh_token=refresh',
      ),
    ).resolves.toBe(true);

    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'token',
      refresh_token: 'refresh',
    });
  });

  it('does not process the same OAuth callback URL more than once', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const url = 'honara7ty://auth-callback?code=facebook-code';

    await expect(handleOAuthCallbackUrl(url)).resolves.toBe(true);
    await expect(handleOAuthCallbackUrl(url)).resolves.toBe(true);

    expect(mockExchangeCodeForSession).toHaveBeenCalledTimes(1);
  });

  it('parses custom scheme devotion group invite links', () => {
    expect(
      getDevotionGroupInviteCodeFromUrl(
        'honara7ty://devotion-group-invite?code=ABC%20123',
      ),
    ).toBe('ABC123');
  });

  it('parses web devotion group invite links', () => {
    expect(
      getDevotionGroupInviteCodeFromUrl(
        'https://honara7ty.space/devotion-group-invite?code=XYZ',
      ),
    ).toBe('XYZ');
  });
});
