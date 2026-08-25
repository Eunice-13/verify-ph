import ViewTransition from "@/components/layout/ViewTransition";
import HomeView from "@/components/feed/HomeView";

export default function Home() {
  return (
    <ViewTransition transitionKey="home">
      <HomeView />
    </ViewTransition>
  );
}
