import Link from "next/link";
import { Limitation, PageTitle, Panel } from "./ui";
export default function About() {
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="INDIA / DOCUMENTATION"
        title="Explore the data responsibly."
        description="RoadSentinel presents documented Indian state and union territory road accident statistics."
      />
      <Panel title="Using the dashboard">
        <p>
          Choose a calendar year, state or union territory, and measure.
          Reported accidents count events; persons killed and persons injured
          count people. The annual chart and accessible table update together.
        </p>
        <p>
          Export selected CSV downloads exactly the displayed rows, including
          India coverage, dataset version, count units and the source URL. Blank
          fatality values preserve a dash in the original source; they are not
          zeros.
        </p>
        <Link className="button" href="/analytics">
          Open Indian statistics
        </Link>
      </Panel>
      <Panel title="Reading the regional map">
        <p>
          The map shades state/UT boundaries by their published counts. It has
          no individual accident markers, invented observations or hotspot
          claims. Click a region or use the state selector to inspect its
          figures. The table provides an accessible alternative for every
          territory.
        </p>
        <p>
          Boundary geometry is an illustrative geoBoundaries/DataMeet release,
          simplified for display. It is not an authoritative boundary survey.
          Road totals are from MoRTH, not from the boundary provider.
        </p>
      </Panel>
      <Limitation>
        Individual injury-severity prediction and explanations are unavailable
        because suitable Indian crash-level training data have not been
        verified. These aggregate statistics cannot estimate whether you will
        crash or what injuries you would sustain.
      </Limitation>
      <Panel title="Sources, history and availability">
        <p>
          Statistics: Ministry of Road Transport and Highways, Government of
          India, Road Accidents in India 2023, Annexures 2-4. This release
          covers 2021-2023 and is not a real-time feed.
        </p>
        <p>
          Existing history retains original country, labels and model versions.
          Records are browser-session isolated and temporary on the free
          backend; exporting is the way to retain a copy. No new predictions can
          be created.
        </p>
        <p>
          If the service is waking, wait about a minute and use Retry
          connection. An unavailable API does not mean an observed count is
          zero.
        </p>
        <Link className="text-link" href="/model-card">
          Read provenance, reuse terms and the data blocker
        </Link>
      </Panel>
    </div>
  );
}
