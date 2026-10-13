import { ScoreEntry } from "@/components/features/score-entry";

export const metadata = { title: "Score entry" };

export default function LecturerScoreEntryPage({ params }: { params: { id: string } }) {
  return <ScoreEntry assessmentId={params.id} backHref="/lecturer/assessments" />;
}
