import PageLoader from "@/components/PageLoader";

export default function Loading() {
  return (
    <div
      className="pt-24 min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#F8F9FC" }}
    >
      <PageLoader />
    </div>
  );
}
