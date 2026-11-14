import { Suspense } from "react";
import Workspace from "@/components/platform/ExplainLab";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading workspace?</p>}>
      <Workspace />
    </Suspense>
  );
}
