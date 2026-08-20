import IKPartLayout from "../components/IKPartLayout";
import QuizClient from "../components/QuizClient";

export default function IKQuizPage() {
  return (
    <IKPartLayout
      current={6}
      title="Quiz — Check Your Understanding"
      subtitle="Part 6 — Answer the questions below"
    >
      <QuizClient />
    </IKPartLayout>
  );
}
