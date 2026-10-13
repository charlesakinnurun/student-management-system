import { ScoreEntry } from "@/components/features/score-entry";

export const metadata = { title: "Score entry" };

export default function AdminScoreEntryPage({ params }: { params: { id: string } }) {
  return <ScoreEntry assessmentId={params.id} backHref="/admin/assessments" />;
}
