const AUTH_POST_LOGIN_TARGET_KEY = "auth_post_login_target";

function normalizePathname(path: string): string {
  const [pathname] = path.split("?");
  return pathname;
}

function isInvitePath(path: string): boolean {
  return /^\/lists\/[^/]+\/join$/.test(normalizePathname(path));
}

export function savePostLoginTarget(path: string) {
  if (isInvitePath(path)) {
    localStorage.setItem(AUTH_POST_LOGIN_TARGET_KEY, path);
  }
}

export function getPostLoginTarget() {
  const target = localStorage.getItem(AUTH_POST_LOGIN_TARGET_KEY);
  if (!target) return null;
  return isInvitePath(target) ? target : null;
}

export function consumePostLoginTarget() {
  const target = getPostLoginTarget();
  localStorage.removeItem(AUTH_POST_LOGIN_TARGET_KEY);
  return target;
}
