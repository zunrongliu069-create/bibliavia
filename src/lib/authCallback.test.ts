import { describe, expect, it } from 'vitest';
import * as authCallback from './authCallback';

const { parseAuthCallbackUrl } = authCallback;

describe('parseAuthCallbackUrl', () => {
  it('parses PKCE authorization codes', () => {
    expect(parseAuthCallbackUrl('https://bibliavia.pages.dev/auth/confirm?code=abc')).toEqual({
      kind: 'code',
      code: 'abc',
    });
  });

  it('parses token hashes for custom magic-link templates', () => {
    expect(
      parseAuthCallbackUrl('https://bibliavia.pages.dev/auth/confirm?token_hash=hash&type=email'),
    ).toEqual({ kind: 'token-hash', tokenHash: 'hash', type: 'email' });
  });

  it('parses implicit sessions and readable errors from URL fragments', () => {
    expect(
      parseAuthCallbackUrl(
        'https://bibliavia.pages.dev/auth/confirm#access_token=a&refresh_token=r',
      ),
    ).toEqual({ kind: 'session', accessToken: 'a', refreshToken: 'r' });
    expect(
      parseAuthCallbackUrl(
        'https://bibliavia.pages.dev/auth/confirm#error=access_denied&error_description=Link+expired',
      ),
    ).toEqual({ kind: 'error', message: 'Link expired' });
  });
});

describe('resolveAuthRedirectUrl', () => {
  it('uses the production callback even when the active browser is localhost', () => {
    const resolveAuthRedirectUrl = (authCallback as Record<string, unknown>)
      .resolveAuthRedirectUrl as (options: {
      development: boolean;
      developmentOrigin?: string;
    }) => string;

    expect(
      resolveAuthRedirectUrl({ development: false, developmentOrigin: 'http://localhost:8081' }),
    ).toBe('https://bibliavia.pages.dev/auth/confirm');
  });

  it('allows localhost only through an explicit development override', () => {
    const resolveAuthRedirectUrl = (authCallback as Record<string, unknown>)
      .resolveAuthRedirectUrl as (options: {
      development: boolean;
      developmentOrigin?: string;
    }) => string;

    expect(resolveAuthRedirectUrl({ development: true })).toBe(
      'https://bibliavia.pages.dev/auth/confirm',
    );
    expect(
      resolveAuthRedirectUrl({
        development: true,
        developmentOrigin: 'http://localhost:8081',
      }),
    ).toBe('http://localhost:8081/auth/confirm');
  });
});

describe('completeAuthCallback', () => {
  it('establishes the session before cleaning auth parameters from the browser URL', async () => {
    const events: string[] = [];
    const session = { access_token: 'access', refresh_token: 'refresh' };
    const fakeClient = {
      exchangeCodeForSession: async (code: string) => {
        events.push(`exchange:${code}`);
        return { data: { session }, error: null };
      },
      verifyOtp: async () => ({ data: { session: null }, error: null }),
      setSession: async () => ({ data: { session: null }, error: null }),
    };
    const completeAuthCallback = (authCallback as Record<string, unknown>).completeAuthCallback as (
      client: typeof fakeClient,
      url: string,
      replaceUrl: (url: string) => void,
    ) => Promise<{ kind: string; session?: unknown }>;

    const result = await completeAuthCallback(
      fakeClient,
      'https://bibliavia.pages.dev/auth/confirm?code=abc#provider_token=secret',
      (url) => events.push(`clean:${url}`),
    );

    expect(result).toEqual({ kind: 'success', session });
    expect(events).toEqual(['exchange:abc', 'clean:/']);
  });
});
