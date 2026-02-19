import { createFileRoute } from '@tanstack/react-router'
import { MyListScreen } from './-screen'

export const Route = createFileRoute('/_protected/lists/')({
  component: MyListsIndexRouteComponent,
})

function MyListsIndexRouteComponent() {
  return <MyListScreen />
}
