import OwnerChat from "./OwnerChat";

// Stage 2 dashboard: typed input. Stage 3 adds the microphone and spoken replies.
export default function OwnerPage() {
  return (
    <main style={{ maxWidth: "36rem", margin: "0 auto", padding: "1rem" }}>
      <OwnerChat />
    </main>
  );
}
