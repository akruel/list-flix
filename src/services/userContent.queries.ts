import { userContentService } from "./userContent";

export const userContentKeys = {
  all: ["userContent"] as const,
};

export const userContentQuery = () => ({
  queryKey: userContentKeys.all,
  queryFn: () => userContentService.getUserContent(),
});
