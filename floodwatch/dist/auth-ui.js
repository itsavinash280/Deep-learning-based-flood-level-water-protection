(async function () {
  'use strict';
  const byId = id => document.getElementById(id);
  let client, mode = 'signin', busy = true, ready = false, activeUser = null;
  let recovering = new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery';
  let confirmationEmail = '';
  const labels = {
    signin: ['Welcome back.', 'Sign in to explore your flood monitoring dashboard.', 'Sign in'],
    signup: ['Start with a clearer view.', 'Create an account with your email and password.', 'Create account'],
    reset: ['Reset your password.', 'We’ll email you a link to choose a new password.', 'Send reset link'],
    recover: ['Choose a new password.', 'Set a new password for your FloodWatch account.', 'Save new password'],
  };
  function message(text = '', error = false) {
    byId('auth-message').textContent = text;
    byId('auth-message').className = 'auth-message' + (error ? ' error' : '');
    byId('auth-message').setAttribute('role', error ? 'alert' : 'status');
    byId('auth-message').setAttribute('aria-live', error ? 'assertive' : 'polite');
    if (error) byId('auth-message').focus();
  }
  function setBusy(value) {
    busy = value;
    byId('auth-fields').disabled = value || !ready;
    document.querySelectorAll('[data-auth-mode],#forgot-password,#back-signin,#resend-confirmation').forEach(button => { button.disabled = value || !ready; });
    byId('auth-submit').textContent = value ? 'Please wait…' : labels[mode][2];
  }
  function showMode(next) {
    mode = next;
    const [title, subtitle, submit] = labels[mode];
    byId('auth-title').textContent = title;
    byId('auth-subtitle').textContent = subtitle;
    byId('auth-submit').textContent = submit;
    byId('auth-tabs').hidden = mode === 'recover' || mode === 'reset';
    byId('auth-email-label').hidden = mode === 'recover';
    byId('auth-email').disabled = mode === 'recover';
    byId('auth-email').required = mode !== 'recover';
    byId('auth-password-label').hidden = mode === 'reset';
    byId('auth-password').disabled = mode === 'reset';
    byId('auth-password').required = mode !== 'reset';
    byId('auth-password').minLength = mode === 'signup' || mode === 'recover' ? 8 : 1;
    byId('auth-password').autocomplete = mode === 'signin' ? 'current-password' : 'new-password';
    byId('auth-confirm-label').hidden = mode !== 'signup' && mode !== 'recover';
    byId('auth-confirm').disabled = mode !== 'signup' && mode !== 'recover';
    byId('auth-confirm').required = mode === 'signup' || mode === 'recover';
    byId('password-hint').hidden = mode !== 'signup' && mode !== 'recover';
    byId('forgot-password').hidden = mode !== 'signin';
    byId('back-signin').hidden = mode !== 'reset';
    byId('resend-confirmation').hidden = true;
    byId('auth-password').value = '';
    byId('auth-confirm').value = '';
    byId('auth-confirm').setCustomValidity('');
    byId('auth-confirm').removeAttribute('aria-invalid');
    byId('auth-confirm-error').hidden = true;
    byId('auth-password').type = 'password';
    byId('show-password').textContent = 'Show';
    byId('show-password').setAttribute('aria-label', 'Show password');
    byId('show-password').setAttribute('aria-pressed', 'false');
    document.querySelectorAll('[data-auth-mode]').forEach(button => {
      const selected = button.dataset.authMode === mode;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    message();
  }
  function setUser(user) {
    if (activeUser && activeUser !== user?.id) { location.replace(location.pathname); return; }
    if (!user) {
      document.body.classList.remove('authenticated');
      if (recovering) { recovering = false; showMode('signin'); }
      return;
    }
    activeUser = user.id;
    if (recovering) { showMode('recover'); return; }
    byId('account-email').textContent = user.email || 'Signed-in user';
    byId('account-email').title = user.email || '';
    byId('account-avatar').textContent = (user.email || 'FW').slice(0, 2).toUpperCase();
    document.body.classList.add('authenticated');
    window.dispatchEvent(new Event('floodwatch:authenticated'));
    byId('auth-form').reset();
  }
  function reportError(error) {
    const code = error?.code;
    const text = code === 'invalid_credentials' ? 'Email or password is incorrect. Please try again.'
      : code === 'email_not_confirmed' ? 'Confirm your email using the link in your inbox, then sign in.'
      : code === 'over_email_send_rate_limit' || error?.status === 429 ? 'Too many requests. Please wait a few minutes and try again.'
      : /fetch|network/i.test(error?.message || '') ? 'Could not reach Supabase. Check your connection and try again.'
      : error?.message || 'Sign-in could not be completed. Please try again.';
    message(text, true);
    if (code === 'email_not_confirmed') {
      confirmationEmail = byId('auth-email').value.trim();
      byId('resend-confirmation').hidden = false;
    }
  }
  const redirectTo = new URL('./', location.href).href;
  document.querySelectorAll('[data-auth-mode]').forEach(button => button.addEventListener('click', () => {
    if (!busy && !recovering) showMode(button.dataset.authMode);
  }));
  byId('forgot-password').addEventListener('click', () => { if (!busy) showMode('reset'); });
  byId('back-signin').addEventListener('click', () => { if (!busy) showMode('signin'); });
  byId('show-password').addEventListener('click', () => {
    const showing = byId('auth-password').type === 'password';
    byId('auth-password').type = showing ? 'text' : 'password';
    byId('show-password').textContent = showing ? 'Hide' : 'Show';
    byId('show-password').setAttribute('aria-label', showing ? 'Hide password' : 'Show password');
    byId('show-password').setAttribute('aria-pressed', String(showing));
  });
  ['auth-password', 'auth-confirm'].forEach(id => byId(id).addEventListener('input', () => {
    byId('auth-confirm').setCustomValidity('');
    byId('auth-confirm').removeAttribute('aria-invalid');
    byId('auth-confirm-error').hidden = true;
  }));
  byId('auth-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !client) return;
    const email = byId('auth-email').value.trim();
    const password = byId('auth-password').value;
    if ((mode === 'signup' || mode === 'recover') && password !== byId('auth-confirm').value) {
      byId('auth-confirm').setCustomValidity('Passwords do not match.');
      byId('auth-confirm').setAttribute('aria-invalid', 'true');
      byId('auth-confirm-error').textContent = 'Enter the same password in both fields.';
      byId('auth-confirm-error').hidden = false;
      message('Passwords do not match.', true); byId('auth-confirm').focus(); return;
    }
    setBusy(true); message();
    try {
      if (mode === 'signin') {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        byId('auth-password').value = '';
      } else if (mode === 'signup') {
        const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
        if (error) throw error;
        if (!data.session) {
          confirmationEmail = email; showMode('signin');
          byId('resend-confirmation').hidden = false;
          message('Check your inbox to confirm your email, then return here to sign in. If no email arrives, the site owner may need to configure email delivery.');
        }
      } else if (mode === 'reset') {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
        message('If this email is registered, a password reset link will arrive shortly. Check your inbox and spam folder.');
      } else {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        recovering = false;
        const { data, error: sessionError } = await client.auth.getUser();
        if (sessionError) throw sessionError;
        setUser(data.user);
      }
    } catch (error) { reportError(error); }
    finally { setBusy(false); }
  });
  byId('resend-confirmation').addEventListener('click', async () => {
    if (!client || busy || !confirmationEmail) return;
    setBusy(true);
    try {
      const { error } = await client.auth.resend({ type: 'signup', email: confirmationEmail, options: { emailRedirectTo: redirectTo } });
      if (error) throw error;
      message('Confirmation requested. Check your inbox and spam folder.');
    } catch (error) { reportError(error); }
    finally { setBusy(false); }
  });
  byId('sign-out').addEventListener('click', async () => {
    byId('sign-out').disabled = true;
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } catch (error) { window.notify('Sign-out failed. Please check your connection and try again.'); }
    finally { byId('sign-out').disabled = false; }
  });
  try {
    const response = await fetch('auth-config.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Sign-in is temporarily unavailable. Please contact the site owner.');
    if (!window.FloodSupabase) throw new Error('The sign-in client could not load. Refresh the page to retry.');
    client = FloodAuth.createClient(FloodSupabase, await response.json());
    const authState = FloodAuth.controller(client.auth, {
      onUser: setUser,
      onRecovery: () => { recovering = true; document.body.classList.remove('authenticated'); showMode('recover'); },
      onError: reportError,
    });
    showMode('signin');
    ready = true;
    await authState.restore();
    const urlError = new URLSearchParams(location.hash.slice(1)).get('error_description');
    if (urlError) { message(urlError, true); history.replaceState(null, '', location.pathname); }
  } catch (error) { reportError(error); }
  finally { setBusy(false); }
})();
