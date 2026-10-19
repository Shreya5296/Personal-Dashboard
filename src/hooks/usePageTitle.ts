import { useEffect } from 'react';
import { APP_NAME } from '../config/publicConfig';

export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME;
  }, [title]);
}
