"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { indiaSchema, unavailableReason } from "@/lib/contracts";
import {
  Failure,
  Limitation,
  Loading,
  PageTitle,
  Panel,
  useMetadata,
} from "./ui";
export default function ModelCard() {
  const metadata = useMetadata();
  const source = useQuery({
    queryKey: ["india-aggregates"],
    queryFn: () => api("insights/overview", indiaSchema),
  });
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="INDIA / DATA & MODEL STATUS"
        title="Evidence before predictions."
        description="An Indian analytics release, with no deployed severity predictor and no claimed model accuracy."
      />
      <Limitation>{unavailableReason}</Limitation>
      <Panel title="Serving capability">
        {metadata.isPending ? (
          <Loading />
        ) : metadata.error ? (
          <Failure
            error={metadata.error}
            retry={() => void metadata.refetch()}
          />
        ) : (
          <>
            <p>
              <strong>Country:</strong> India | <strong>Model:</strong> none |{" "}
              <strong>Prediction:</strong> disabled
            </p>
            <p>Dataset version: {metadata.data.dataset_version}</p>
            <p>
              Per-class recall, macro F1, balanced accuracy and confusion
              matrix:{" "}
              <strong>
                not applicable: no Indian model was trained or evaluated.
              </strong>
            </p>
          </>
        )}
      </Panel>
      <Panel title="Verified data and measurement units">
        {source.isPending ? (
          <Loading />
        ) : source.error ? (
          <Failure error={source.error} retry={() => void source.refetch()} />
        ) : (
          <>
            <p>
              <a href={source.data.source_url}>{source.data.source}</a>
            </p>
            <p>
              2021-2023; 36 states and union territories; 108 state/UT-year
              rows. Official police-reported aggregates, extracted from
              Annexures 2-4. Reported accidents count events; persons killed and
              persons injured count people.
            </p>
            <p>
              No individual crash coordinates, injury-severity classes, driving
              speeds or posted speed limits are supplied by these tables. No mph
              or km/h assumption is applied.
            </p>
            <p>
              {source.data.license}.{" "}
              <a href={source.data.license_url}>Source reuse policy</a>.
            </p>
            <p className="india-hash">
              Source checksum: {source.data.source_sha256}
            </p>
            <p>{source.data.geography.note}</p>
          </>
        )}
      </Panel>
      <Panel title="Crash-level data assessment">
        <p>
          The official iRAD/eDAR system uses authenticated departmental access.
          A public multi-outcome crash-level download with verified reuse rights
          was not obtained.
        </p>
        <p>
          The openly licensed{" "}
          <a href="https://data.mendeley.com/datasets/bc5sv6wnd9/7">
            IIT Delhi media-reported crash dataset
          </a>{" "}
          covers 2,898 fatal crashes reported in 2022-2023. Its CC BY 4.0
          licence permits reuse, but its fatal-only selection cannot establish
          discrimination between fatal and nonfatal outcomes. Media coverage
          also introduces selection bias.
        </p>
        <p>
          Aggregate totals, synthetic data and foreign models are not
          substitutes for Indian crash-level training observations. A future
          model must use leakage-safe inputs, a held-out evaluation, a baseline
          and evidence beyond majority-class predictions before release.
        </p>
      </Panel>
      <Panel title="Supported features and limits">
        <p>
          State/UT and annual comparisons, a regional choropleth, accessible
          data tables and CSV exports are supported. Counts are not adjusted for
          traffic exposure, population or travel distance and do not rank
          personal safety.
        </p>
        <p>
          Prediction, speed exploration, scenario comparison, batch inference
          and explanations are disabled at both the interface and API. Old
          results are available only as historical snapshots of their original
          country and model.
        </p>
        <p>
          History remains temporary on free hosting. The service may need time
          to wake after inactivity.
        </p>
        <div className="actions">
          <Link className="button" href="/analytics">
            Explore statistics
          </Link>
          <Link className="button" href="/history">
            Historical records
          </Link>
        </div>
      </Panel>
    </div>
  );
}
