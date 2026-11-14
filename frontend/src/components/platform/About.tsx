import Link from "next/link";
import { PageTitle, Panel } from "./ui";
export default function About() {
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="RESOURCES / DOCUMENTATION"
        title="How to use RoadSentinel."
        description="An educational exploration of documented injury-severity patterns, with the limitations kept visible."
      />
      <Panel title="Start with a scenario">
        <div className="doc-content">
          <ol>
            <li>
              Choose the posted speed limit in mph, road conditions, local hour
              and weekday.
            </li>
            <li>
              Run the model. The three percentages estimate the most severe
              injury, conditional on a police-recorded injury crash.
            </li>
            <li>
              Read all three probabilities and the model&apos;s performance
              warning. The most likely label is not a safety verdict.
            </li>
            <li>
              Open &ldquo;What influenced this estimate?&rdquo; for input
              contributions. These explain the model; they do not prove what
              causes injuries.
            </li>
            <li>
              Save an estimate to temporary history or export JSON to retain its
              inputs, labels, explanation and model version.
            </li>
          </ol>
          <p>
            Changing inputs clears the previous result. Shared links contain a
            scenario, not a saved result.
          </p>
        </div>
      </Panel>
      <Panel title="Compare and upload">
        <p>
          Comparison evaluates two hypothetical road scenarios. Posted speed
          exploration uses 20, 30, 40, 50, 60 and 70 mph; it does not use GPS or
          actual driving speed.
        </p>
        <p>
          Download the CSV template from Batch processing. Use readable choices
          from the category guide, preview and map the columns, then process up
          to 250 rows. Invalid rows are reported individually. Exports include
          all probabilities and the model version.
        </p>
      </Panel>
      <Panel title="Coverage and evidence">
        <p>
          DfT STATS19 covers police-recorded injury crashes on public roads in
          England, Scotland and Wales. This release uses 2022 for training and
          2023 for testing and observations. It has no verified India coverage
          and does not include non-crash journeys or damage-only incidents.
        </p>
        <p>
          The model chooses slight injury for every test crash. It misses
          serious and fatal outcomes as top predictions. Read the complete
          evaluation before interpreting estimates.
        </p>
        <Link className="text-link" href="/model-card">
          Model card and test results ↗
        </Link>
      </Panel>
      <Panel title="History and service availability">
        <p>
          History is temporary on the free backend. It can be lost when the
          service sleeps, restarts or redeploys. A random token in browser
          storage isolates records; clearing that storage loses access. There
          are no cross-device accounts. Export anything you need to keep.
        </p>
        <p>
          The free service may take about a minute to wake after inactivity.
          Wait and use Retry connection if a request times out. Requests are not
          silently resubmitted, which avoids duplicate saved predictions.
        </p>
        <p>
          Old predictions keep their original model version and label meanings.
          They are never relabelled as outcomes from the new model.
        </p>
      </Panel>
      <Panel title="Source and reproducibility">
        <p>
          Contains public sector information licensed under the{" "}
          <a
            className="text-link"
            href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
          >
            Open Government Licence v3.0
          </a>
          . Source: Department for Transport. No official endorsement is
          implied.
        </p>
        <p>
          <a
            className="text-link"
            href="https://www.gov.uk/government/statistical-data-sets/road-safety-open-data"
          >
            Official data and codebook ↗
          </a>
        </p>
        <p>
          <a
            className="text-link"
            href="https://github.com/Shouktick/RoadSentinel"
          >
            Source code, pinned downloads, training commands and evaluation ↗
          </a>
        </p>
      </Panel>
    </div>
  );
}
