export type AuthCallback =
  | { kind: 'none' }
  | { kind: 'code'; code: string }
  | { kind: 'token-hash'; tokenHash: string; type: 'email' | 'email_change' }
  | { kind: 'session'; accessToken: string; refreshToken: string }
  | { kind: 'error'; message: string };

interface AuthCallbackClient<TSession> {
  exchangeCodeForSession: (
    code: string,
  ) => Promise<{ data: { session: TSession | null }; error: { message: string } | null }>;
  verifyOtp: (options: {
    token_hash: string;
    type: 'email' | 'email_change';
  }) => Promise<{ data: { session: TSession | null }; error: { message: string } | null }>;
  setSession: (options: {
    access_token: string;
    refresh_token: string;
  }) => Promise<{ data: { session: TSession | null }; error: { message: string } | null }>;
}

export type AuthCallbackResult<TSession> =
  | { kind: 'none' }
  | { kind: 'success'; session: TSession }
  | { kind: 'error'; message: string };

const PRODUCTION_AUTH_CALLBACK_URL = 'https://bibliavia.pages.dev/auth/confirm';

export function resolveAuthRedirectUrl(options: {
  development: boolean;
  developmentOrigin?: string;
}): string {
  if (!options.development || !options.developmentOrigin) return PRODUCTION_AUTH_CALLBACK_URL;
  try {
    const origin = new URL(options.developmentOrigin);
    if (origin.hostname !== 'localhost' && origin.hostname !== '127.0.0.1') {
      return PRODUCTION_AUTH_CALLBACK_URL;
    }
    return `${origin.origin}/auth/confirm`;
  } catch {
    return PRODUCTION_AUTH_CALLBACK_URL;
  }
}

const first = (query: URLSearchParams, hash: URLSearchParams, key: string) =>
  query.get(key) ?? hash.get(key);

export function parseAuthCallbackUrl(url: string | null): AuthCallback {
  if (!url) return { kind: 'none' };
  try {
    const parsed = new URL(url);
    const query = parsed.searchParams;
    const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
    const error = first(query, hash, 'error_description') ?? first(query, hash, 'error');
    if (error) return { kind: 'error', message: error.replace(/\+/g, ' ') };

    const tokenHash = first(query, hash, 'token_hash');
    if (tokenHash) {
      return {
        kind: 'token-hash',
        tokenHash,
        type: first(query, hash, 'type') === 'email_change' ? 'email_change' : 'email',
      };
    }

    const code = first(query, hash, 'code');
    if (code) return { kind: 'code', code };

    const accessToken = first(query, hash, 'access_token');
    const refreshToken = first(query, hash, 'refresh_token');
    if (accessToken && refreshToken) return { kind: 'session', accessToken, refreshToken };
    return { kind: 'none' };
  } catch {
    return { kind: 'error', message: 'The sign-in link is invalid.' };
  }
}

export async function completeAuthCallback<TSession>(
  client: AuthCallbackClient<TSession>,
  url: string | null,
  replaceUrl: (url: string) => void,
): Promise<AuthCallbackResult<TSession>> {
  const callback = parseAuthCallbackUrl(url);
  if (callback.kind === 'none') return { kind: 'none' };
  if (callback.kind === 'error') {
    replaceUrl('/');
    return callback;
  }

  const result =
    callback.kind === 'code'
      ? await client.exchangeCodeForSession(callback.code)
      : callback.kind === 'token-hash'
        ? await client.verifyOtp({ token_hash: callback.tokenHash, type: callback.type })
        : await client.setSession({
            access_token: callback.accessToken,
            refresh_token: callback.refreshToken,
          });

  replaceUrl('/');
  if (result.error || !result.data.session) {
    return {
      kind: 'error',
      message: result.error?.message ?? 'The sign-in link is invalid or has expired.',
    };
  }
  return { kind: 'success', session: result.data.session };
}
