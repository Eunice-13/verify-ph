import ViewTransition from "@/components/layout/ViewTransition";
import AboutView from "@/components/about/AboutView";

export default function AboutPage() {
  return (
    <ViewTransition transitionKey="about">
      <AboutView />
    </ViewTransition>
  );
}
