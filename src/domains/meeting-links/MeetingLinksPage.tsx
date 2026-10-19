import React from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { MeetingLinkList } from './MeetingLinkList';

export const MeetingLinksPage: React.FC = () => {
  usePageTitle('Meeting Links');

  return (
    <div>
      <MeetingLinkList />
    </div>
  );
};
