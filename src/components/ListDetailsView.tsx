import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useListDetails, useListItemDetails } from "@/hooks/useListQueries";

import { ListHeader } from "./list-details/ListHeader";
import {
  ListItemsGrid,
  type ListItemWithContent,
} from "./list-details/ListItemsGrid";
import { ListMembersBar } from "./list-details/ListMembersBar";

interface ListDetailsViewProps {
  id: string;
}

const ListDetailsSkeleton = () => (
  <div
    className="space-y-8 duration-500 animate-in fade-in"
    data-testid="list-details-skeleton"
  >
    <div className="flex items-start justify-between">
      <div className="w-full max-w-lg space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
    <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {[...Array(10)].map((_, i) => (
        <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
      ))}
    </div>
  </div>
);

export function ListDetailsView({ id }: ListDetailsViewProps) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useListDetails(id);

  const tmdbResults = useListItemDetails(data?.items ?? []);

  const itemsWithContent: ListItemWithContent[] = (data?.items ?? []).map(
    (item, index) => {
      const result = tmdbResults[index];
      return {
        ...item,
        content: result?.data,
        isContentLoading: !!result?.isPending,
      };
    },
  );

  if (!id || isLoading) {
    return <ListDetailsSkeleton />;
  }

  if (isError || !data?.list) {
    return (
      <div className="py-20 text-center">
        <h2 className="mb-4 text-2xl text-destructive">
          {isError ? "Failed to load list" : "List not found"}
        </h2>
        <Button
          variant="link"
          onClick={() => navigate({ to: "/lists", search: { tab: "custom" } })}
          className="mx-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para minhas listas
        </Button>
      </div>
    );
  }

  const { list, members } = data;
  const canEdit = list.role === "owner" || list.role === "editor";

  return (
    <div
      data-testid="route-list-details"
      className="duration-300 animate-in fade-in"
    >
      <div className="mb-8 flex flex-col gap-4">
        <ListHeader list={list} itemsCount={itemsWithContent.length} />
        <div className="pl-[3.25rem]">
          <ListMembersBar list={list} members={members} />
        </div>
      </div>

      <ListItemsGrid
        listId={list.id}
        items={itemsWithContent}
        canEdit={canEdit}
      />
    </div>
  );
}
