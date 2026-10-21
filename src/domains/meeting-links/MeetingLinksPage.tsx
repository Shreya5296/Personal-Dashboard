import React from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { MeetingLinkList } from './MeetingLinkList';
import { PageHeader } from '../../layout/PageHeader';

export const MeetingLinksPage: React.FC = () => {
  usePageTitle('Meeting Links');

  return (
    <div>
      <PageHeader
        title="Meeting Links Directory"
        subtitle="Manage permanent Google Meet and Zoom classroom links mapped to individual students."
      />
      <MeetingLinkList />
    </div>
  );
};
