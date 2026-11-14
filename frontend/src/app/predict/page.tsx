import { Suspense } from "react";
import Workspace from "@/components/platform/PredictionWorkspace";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading workspace?</p>}>
      <Workspace />
    </Suspense>
  );
}
