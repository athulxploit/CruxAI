import { createFileRoute } from '@tanstack/react-router';
import { WorkflowEditor } from '@/components/workflow/WorkflowEditor';

export const Route = createFileRoute('/workflows/$id')({
  component: WorkflowEditorPage,
});

function WorkflowEditorPage() {
  return (
    <div className="h-screen w-full bg-background overflow-hidden">
      <WorkflowEditor />
    </div>
  );
}
