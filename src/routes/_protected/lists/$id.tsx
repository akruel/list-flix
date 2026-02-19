import { createFileRoute, Outlet } from '@tanstack/react-router'
import { MyListScreen } from './-screen'

export const Route = createFileRoute('/_protected/lists/$id')({
  component: MyListDetailsRouteComponent,
})

function MyListDetailsRouteComponent() {
  const { id } = Route.useParams()
  return (
    <>
      <MyListScreen listId={id} />
      <Outlet />
    </>
  )
}
