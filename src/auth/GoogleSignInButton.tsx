import React, { useEffect } from 'react';
import { handleSuccessfulSignIn } from './signIn';
import { AuthUser } from './authState';

interface GoogleSignInButtonProps {
  clientId: string;
  onSuccess: (token: string, user: AuthUser) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ clientId, onSuccess }) => {
  useEffect(() => {
    if (!clientId) return;

    const setupGsi = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (res: { credential?: string }) => {
            if (res.credential) {
              const user = handleSuccessfulSignIn(res.credential);
              onSuccess(res.credential, user);
            }
          },
        });
        const target = document.getElementById('google-signin-mount');
        if (target) {
          target.innerHTML = '';
          window.google.accounts.id.renderButton(target, {
            theme: 'outline',
            size: 'large',
            width: 320,
          });
        }
      }
    };

    if (window.google?.accounts?.id) {
      setupGsi();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          setupGsi();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [clientId, onSuccess]);

  return <div id="google-signin-mount" style={{ minHeight: '44px', display: 'flex', justifyContent: 'center' }} />;
};
