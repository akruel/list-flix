import { listService } from "./listService";

export const listsKeys = {
  all: ["lists"] as const,
  detail: (id: string) => [...listsKeys.all, "detail", id] as const,
  containingContent: (contentId: number, contentType: "movie" | "tv") =>
    [...listsKeys.all, "containingContent", contentType, contentId] as const,
  name: (id: string) => [...listsKeys.all, "name", id] as const,
};

export const listsQuery = () => ({
  queryKey: listsKeys.all,
  queryFn: () => listService.getLists(),
});

export const listDetailsQuery = (id: string) => ({
  queryKey: listsKeys.detail(id),
  queryFn: () => listService.getListDetails(id),
  enabled: id.length > 0,
});

export const listsContainingContentQuery = (
  contentId: number,
  contentType: "movie" | "tv",
) => ({
  queryKey: listsKeys.containingContent(contentId, contentType),
  queryFn: () => listService.getListsContainingContent(contentId, contentType),
});

export const listNameQuery = (id: string) => ({
  queryKey: listsKeys.name(id),
  queryFn: () => listService.getListName(id),
  enabled: id.length > 0,
});
