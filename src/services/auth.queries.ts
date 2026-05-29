import { authService } from "./auth";

const authKeys = {
  all: ["auth"] as const,
  userProfile: () => [...authKeys.all, "userProfile"] as const,
};

export const userProfileQuery = () => ({
  queryKey: authKeys.userProfile(),
  queryFn: () => authService.getUserProfile(),
  retry: false,
});
