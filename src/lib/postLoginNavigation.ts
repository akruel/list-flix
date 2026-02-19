type InviteRole = 'editor' | 'viewer';

export type PostLoginDestination =
  | { to: '/' }
  | {
      to: '/lists/$id/join';
      params: {
        id: string;
      };
      search?: {
        role?: InviteRole;
      };
    };

const INVITE_PATH_REGEX = /^\/lists\/([^/]+)\/join$/;

export function getPostLoginDestination(target: string | null | undefined): PostLoginDestination {
  if (!target) {
    return { to: '/' };
  }

  const [pathname, queryString = ''] = target.split('?');
  const inviteMatch = INVITE_PATH_REGEX.exec(pathname);

  if (!inviteMatch) {
    return { to: '/' };
  }

  const id = decodeURIComponent(inviteMatch[1]);
  const roleParam = new URLSearchParams(queryString).get('role');
  const role: InviteRole | undefined = roleParam === 'editor' || roleParam === 'viewer' ? roleParam : undefined;

  if (role) {
    return {
      to: '/lists/$id/join',
      params: { id },
      search: { role },
    };
  }

  return {
    to: '/lists/$id/join',
    params: { id },
  };
}
