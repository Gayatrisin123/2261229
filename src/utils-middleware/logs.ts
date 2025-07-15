type StackType = 'frontend' | 'backend';
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogOptions {
  stack: StackType;
  level: LogLevel;
  packageName: string;
  message: string;
  accessToken?: string;
}

export async function log({
  stack,
  level,
  packageName,
  message,
  accessToken,
}: LogOptions): Promise<void> {
  const LOG_ENDPOINT = '/api/evaluation-service/logs';

  const token =
    accessToken ||
    import.meta.env.VITE_ACCESS_TOKEN ||
    localStorage.getItem('authToken');

  if (!token) {
    if (import.meta.env.DEV) {
      console.warn('[Logger] ❌ No access token provided or found in localStorage.');
    }
    return;
  }

  try {
    const response = await fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        stack,
        level,
        package: packageName,
        message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (import.meta.env.DEV) {
        console.error('❌ Logging failed:', data?.message || `HTTP ${response.status}`);
      }
      return;
    }

    if (import.meta.env.DEV) {
      console.log('✅ Log sent:', data.message, '| ID:', data.logID);
    }
  } catch (error: any) {
    console.error('❌ Logging failed:', error?.message || error);
  }
}
