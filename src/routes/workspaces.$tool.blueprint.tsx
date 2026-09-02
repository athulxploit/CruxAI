import { createFileRoute } from "@tanstack/react-router";
import { BlueprintView } from "@/components/arch/blueprint-view";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getBlueprint } from "@/lib/blueprint/blueprint.functions";

export const Route = createFileRoute("/workspaces/$tool/blueprint")({
  head: () => ({
    meta: [
      { title: "Project Blueprint — Metrixcom" },
      { name: "description", content: "View the living intelligence, vision, and architecture of your project through the Crux Blueprint." },
      { property: "og:title", content: "Crux Blueprint" },
      { property: "og:description", content: "Detailed project vision, architecture, and engineering protocols." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkspaceBlueprint,
});

function WorkspaceBlueprint() {
  const { tool } = Route.useParams();
  
  const { data: blueprint } = useSuspenseQuery({
    queryKey: ["blueprint", tool],
    queryFn: () => getBlueprint({ data: { workspaceId: tool } }),
  });

  return <BlueprintView workspaceId={tool} initialBlueprint={blueprint} />;
}
