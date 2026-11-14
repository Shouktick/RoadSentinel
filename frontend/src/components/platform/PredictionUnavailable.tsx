import Link from "next/link";
import { unavailableReason } from "@/lib/contracts";
import { Limitation, PageTitle, Panel } from "./ui";

export default function PredictionUnavailable() {
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="INDIA / CAPABILITY STATUS"
        title="Severity prediction is unavailable."
        description="RoadSentinel now uses Indian data only. No severity model is serving predictions."
      />
      <Limitation>{unavailableReason}</Limitation>
      <Panel title="What you can explore">
        <p>
          Compare reported accidents, persons killed and persons injured across
          36 Indian states and union territories for 2021–2023. Download the
          underlying aggregate counts and inspect their source.
        </p>
        <div className="actions">
          <Link className="button primary" href="/analytics">
            Explore Indian statistics
          </Link>
          <Link className="button" href="/map">
            Open India regional map
          </Link>
        </div>
      </Panel>
      <Panel title="Why the prediction tools are disabled">
        <p>
          State totals contain neither individual-crash outcomes nor the inputs
          needed to validate an injury-severity model. An accessible Indian
          media dataset contains only fatal crashes. Neither supports a
          multi-outcome severity predictor.
        </p>
        <p>
          Single prediction, scenario comparison, speed exploration, batch
          prediction and model explanations are disabled together. There is no
          replacement accuracy claim, probability or safety score.
        </p>
        <p>
          Older saved results remain historical records with their original
          country, labels and model version. They are not Indian estimates.
        </p>
        <Link className="text-link" href="/model-card">
          Read the data and model status
        </Link>
      </Panel>
    </div>
  );
}
