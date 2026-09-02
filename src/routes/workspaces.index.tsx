import { createFileRoute } from '@tanstack/react-router'
import { WorkspacesHub } from './workspaces'

export const Route = createFileRoute('/workspaces/')({
  head: () => ({
    meta: [
      { title: "Workspaces — Metrixcom" },
      { name: "description", content: "Explore specialized AI workspaces for developers and security professionals. From code refactoring to threat modeling." },
      { property: "og:title", content: "Metrixcom Workspaces" },
      { property: "og:description", content: "Professional AI-powered workspaces for every engineering task." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkspacesHub
})
