import { use } from "react";
import PublicStudyViewer from "@/components/PublicStudyViewer";

export default function EmbedDeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PublicStudyViewer deckId={id} />;
}
