(function (root) {
  'use strict';
  function createClient(sdk, config) {
    if (!config || !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(config.url) ||
        typeof config.publishableKey !== 'string' || !config.publishableKey.startsWith('sb_publishable_')) {
      throw new Error('Sign-in is temporarily unavailable. Please contact the site owner.');
    }
    return sdk.createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  // Keep provider state separate from the page so session races can be tested.
  function controller(auth, { onUser, onRecovery, onError }) {
    let revision = 0;
    async function verify(session) {
      const current = ++revision;
      if (!session) { onUser(null); return; }
      try {
        const { data, error } = await auth.getUser();
        if (current !== revision) return;
        if (error || !data.user) { onUser(null); if (error) onError(error); }
        else onUser(data.user);
      } catch (error) { if (current === revision) { onUser(null); onError(error); } }
    }
    const { data: listener } = auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      if (event === 'SIGNED_OUT') { ++revision; onUser(null); return; }
      if (event === 'PASSWORD_RECOVERY') onRecovery();
      // Provider callbacks are synchronous. Defer API calls outside their lock.
      queueMicrotask(() => verify(session));
    });
    return {
      async restore() {
        const start = revision;
        try {
          const { data, error } = await auth.getSession();
          if (start !== revision) return;
          if (error) { onUser(null); onError(error); return; }
          await verify(data.session);
        } catch (error) { if (start === revision) { onUser(null); onError(error); } }
      },
      dispose() { ++revision; listener.subscription.unsubscribe(); },
    };
  }
  const api = { createClient, controller };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FloodAuth = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
