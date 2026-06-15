import PageLoader from "@/components/PageLoader";

export default function Loading() {
  return (
    <div
      className="pt-24 md:pt-36 min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#F0EEE9" }}
    >
      <PageLoader />
    </div>
  );
}
