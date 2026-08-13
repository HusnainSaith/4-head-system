import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <PageContainer>
      <PageHeader title={title} />
      <EmptyState
        title="Coming soon"
        description="This module is intentionally waiting for its confirmed backend integration."
      />
    </PageContainer>
  );
}
