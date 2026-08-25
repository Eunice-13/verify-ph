import ViewTransition from "@/components/layout/ViewTransition";
import ClaimCheckerForm from "@/components/claim/ClaimCheckerForm";

export default function ClaimCheckPage() {
  return (
    <ViewTransition transitionKey="claim-checker">
      <section className="min-h-[80vh] flex flex-col items-center justify-center max-w-4xl mx-auto px-6 py-20 md:py-32 text-center">
        <h1 className="font-serif font-bold text-4xl md:text-6xl text-emerald-950 leading-tight mb-14">
          What should we verify today?
        </h1>
        <ClaimCheckerForm />
      </section>
    </ViewTransition>
  );
}
