/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: {
          client_id: string;
          callback: (res: { credential?: string }) => void;
        }) => void;
        renderButton: (
          parent: HTMLElement,
          options: { theme?: string; size?: string; width?: number }
        ) => void;
      };
    };
  };
}
