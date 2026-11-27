import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

/**
 * Resolves an API endpoint to the correct URL (Render deployed or local proxy)
 */
export function buildApiUrl(endpoint) {
  if (!endpoint) return '';
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  // In development, Vite proxy handles /api seamlessly.
  // In production builds (Vercel, Netlify, Render), prefix with VITE_API_URL if defined.
  const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
}

/**
 * Safely parses API responses to prevent "Unexpected end of JSON input" errors.
 * Handles empty bodies, proxy timeouts, non-JSON text, and HTTP error responses.
 */
async function parseResponseSafely(res, defaultErrorMessage = 'Request failed.') {
  const contentType = res.headers.get('content-type') || '';
  let data = null;

  try {
    const rawText = await res.text();
    if (rawText && rawText.trim().length > 0) {
      if (contentType.includes('application/json')) {
        try {
          data = JSON.parse(rawText);
        } catch (jsonErr) {
          console.warn('[AuthContext Safe Parse]: Malformed JSON body received:', jsonErr.message);
          data = { message: rawText };
        }
      } else {
        data = { message: rawText };
      }
    }
  } catch (readErr) {
    console.warn('[AuthContext Safe Parse]: Failed to read response stream:', readErr.message);
    data = null;
  }

  // Handle server proxy or gateway errors gracefully
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new Error('INTERVIX AI backend server is currently waking up or unreachable. Please wait a few moments and try again.');
  }

  if (!res.ok) {
    const message = data?.message || defaultErrorMessage || `Server returned error status: ${res.status}`;
    throw new Error(message);
  }

  if (!data) {
    return { success: true };
  }

  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('intervix_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('intervix_token') || null;
  });

  const [loading, setLoading] = useState(true);

  // Authenticate and verify user session on mount
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const storedToken = localStorage.getItem('intervix_token');

      if (!storedToken) {
        // No token: user is not logged in. Clear any stale user data.
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(buildApiUrl('/api/auth/me'), {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (res.ok) {
          const data = await parseResponseSafely(res, 'Failed to verify session.');
          if (isMounted && data?.user) {
            setUser(data.user);
            localStorage.setItem('intervix_user', JSON.stringify(data.user));
          }
        } else if (res.status === 401) {
          // Token expired — log out cleanly
          if (isMounted) logout();
        }
      } catch (err) {
        console.warn('[Session Verification Note]:', err.message);
        // Keep the stored user on transient network failure — do not force logout
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email, password) => {
    if (!email || !email.trim()) {
      throw new Error('Please enter your email address.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    let res;
    try {
      res = await fetch(buildApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
    } catch (networkErr) {
      console.error('[Login Network Error]:', networkErr);
      throw new Error('Unable to reach INTERVIX AI server. If the backend is on Render, it may be waking up from sleep mode (~30s). Please try again.');
    }

    const data = await parseResponseSafely(res, 'Login failed. Please check your credentials.');

    if (!data.token || !data.user) {
      throw new Error('Invalid authentication response from server.');
    }

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('intervix_token', data.token);
    localStorage.setItem('intervix_user', JSON.stringify(data.user));
    return data.user;
  };

  const register = async (name, email, password) => {
    if (!name || !name.trim()) {
      throw new Error('Please enter your full name.');
    }
    if (!email || !email.trim()) {
      throw new Error('Please enter your email address.');
    }
    if (!password) {
      throw new Error('Please enter a password.');
    }

    let res;
    try {
      res = await fetch(buildApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
    } catch (networkErr) {
      console.error('[Register Network Error]:', networkErr);
      throw new Error('Unable to reach INTERVIX AI server. If the backend is on Render, it may be waking up from sleep mode (~30s). Please try again.');
    }

    const data = await parseResponseSafely(res, 'Registration failed.');

    if (!data.token || !data.user) {
      throw new Error('Invalid registration response from server.');
    }

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('intervix_token', data.token);
    localStorage.setItem('intervix_user', JSON.stringify(data.user));
    return data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('intervix_token');
    localStorage.removeItem('intervix_user');
  };

  /**
   * Authenticated API helper with automatic JWT Bearer attachment.
   * - Does NOT set Content-Type when body is FormData (browser sets multipart boundary).
   * - Does NOT hardcode or inject any credentials automatically.
   * - Throws and redirects on 401.
   */
  const authFetch = async (url, options = {}) => {
    const activeToken = token || localStorage.getItem('intervix_token');

    if (!activeToken) {
      // Not authenticated — redirect to login
      logout();
      window.location.href = '/login';
      throw new Error('Not authenticated. Please log in to continue.');
    }

    const headers = {
      Accept: 'application/json',
      ...(options.headers || {}),
    };

    // If body is FormData, remove Content-Type so browser sets the multipart boundary correctly
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    } else {
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    headers.Authorization = `Bearer ${activeToken}`;

    let response;
    try {
      response = await fetch(buildApiUrl(url), {
        ...options,
        headers,
      });
    } catch (netErr) {
      console.error('[authFetch Network Failure]:', netErr);
      throw new Error('Network connection error: Unable to reach backend server. If using Render, please wait ~30s for wake-up.');
    }

    if (response.status === 401) {
      logout();
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }

    return response;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        authFetch,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
