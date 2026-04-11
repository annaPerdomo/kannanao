import { use } from "react";
import EmbedStudy from "@/components/EmbedStudy";

export default function EmbedDeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <EmbedStudy deckId={id} />;
}
