"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";
import {
  CAREER_MOTIVATION_MICRO_NICHES,
  MicroNiche,
  MonetizationGoal,
  MONETIZATION_GOALS,
  TIME_LABELS,
  TimeAvailability,
} from "@/data/niches";

type AnalysisResult = {
  microNiche: MicroNiche;
  compositeScore: number;
  interestCoverage: number;
  matchedSignals: string[];
  scoreBreakdown: {
    label: string;
    weight: number;
    value: number;
  }[];
};

const TIME_OPTIONS: { value: TimeAvailability; label: string }[] = [
  { value: "under5", label: "< 5 hrs / week" },
  { value: "5to10", label: "5 - 10 hrs / week" },
  { value: "10to15", label: "10 - 15 hrs / week" },
  { value: "15plus", label: "15+ hrs / week" },
];

const TIME_COMPATIBILITY: Record<
  TimeAvailability,
  Record<TimeAvailability, number>
> = {
  under5: {
    under5: 1,
    "5to10": 0.7,
    "10to15": 0.45,
    "15plus": 0.3,
  },
  "5to10": {
    under5: 0.85,
    "5to10": 1,
    "10to15": 0.75,
    "15plus": 0.6,
  },
  "10to15": {
    under5: 0.7,
    "5to10": 0.85,
    "10to15": 1,
    "15plus": 0.85,
  },
  "15plus": {
    under5: 0.55,
    "5to10": 0.75,
    "10to15": 0.9,
    "15plus": 1,
  },
};

const GOAL_ORDER: MonetizationGoal[] = [
  "$500/month",
  "$2000/month",
  "$5000/month",
  "maximum growth",
];

const TREND_SCORE: Record<MicroNiche["searchTrend"], number> = {
  growing: 1,
  stable: 0.75,
  declining: 0.35,
};

const COMPETITION_SCORE: Record<MicroNiche["competitionLevel"], number> = {
  Low: 1,
  Medium: 0.72,
  High: 0.45,
};

const WEIGHTS = {
  interests: 0.35,
  time: 0.15,
  goal: 0.15,
  trend: 0.1,
  loyalty: 0.1,
  saturation: 0.1,
  competition: 0.05,
};

const formatCurrencyRange = (range: [number, number]) =>
  `$${range[0]}-$${range[1]}`;

const scoreToLetter = (score: number) => {
  if (score >= 85) return "A";
  if (score >= 75) return "B+";
  if (score >= 65) return "B";
  if (score >= 55) return "C+";
  return "C";
};

const humanizeGoal = (goal: MonetizationGoal | "long-tail") =>
  goal === "long-tail" ? "Audience-first runway" : goal;

export default function Page() {
  const [interests, setInterests] = useState(
    "leadership development, productivity systems, tech career coaching",
  );
  const [timeAvailability, setTimeAvailability] =
    useState<TimeAvailability>("5to10");
  const [monetizationGoal, setMonetizationGoal] =
    useState<MonetizationGoal>("$2000/month");

  const interestTokens = useMemo(() => {
    return interests
      .toLowerCase()
      .split(/[^a-z0-9\+]+/)
      .map((token) => token.trim())
      .filter(Boolean);
  }, [interests]);

  const analysis = useMemo(() => {
    const goalIndex = GOAL_ORDER.indexOf(monetizationGoal);

    const scored = CAREER_MOTIVATION_MICRO_NICHES.map<AnalysisResult>(
      (micro) => {
        const matchedSignals = micro.skillSignals.filter((signal) =>
          interestTokens.some((token) => token.includes(signal)),
        );
        const interestCoverage =
          micro.skillSignals.length === 0
            ? 0
            : matchedSignals.length / micro.skillSignals.length;

        const timeScore =
          TIME_COMPATIBILITY[timeAvailability][micro.productionIntensity];

        const nicheGoalIndex =
          micro.monetizationCeiling === "long-tail"
            ? -1
            : GOAL_ORDER.indexOf(
                micro.monetizationCeiling as MonetizationGoal,
              );

        let goalScore = 0.55;
        if (micro.monetizationCeiling === "long-tail") {
          goalScore = goalIndex <= 1 ? 0.7 : 0.4;
        } else if (nicheGoalIndex >= goalIndex) {
          goalScore = 1;
        } else if (goalIndex - nicheGoalIndex === 1) {
          goalScore = 0.75;
        } else {
          goalScore = 0.5;
        }

        const saturationScore = 1 - micro.contentSaturation / 10;
        const loyaltyScore = micro.audienceLoyalty / 10;
        const trendScore = TREND_SCORE[micro.searchTrend];
        const competitionScore = COMPETITION_SCORE[micro.competitionLevel];

        const compositeScore =
          interestCoverage * WEIGHTS.interests +
          timeScore * WEIGHTS.time +
          goalScore * WEIGHTS.goal +
          trendScore * WEIGHTS.trend +
          loyaltyScore * WEIGHTS.loyalty +
          saturationScore * WEIGHTS.saturation +
          competitionScore * WEIGHTS.competition;

        const scoreBreakdown: AnalysisResult["scoreBreakdown"] = [
          {
            label: "Interest Fit",
            weight: WEIGHTS.interests,
            value: interestCoverage,
          },
          { label: "Time Match", weight: WEIGHTS.time, value: timeScore },
          { label: "Monetization Ceiling", weight: WEIGHTS.goal, value: goalScore },
          { label: "Search Trend", weight: WEIGHTS.trend, value: trendScore },
          { label: "Audience Loyalty", weight: WEIGHTS.loyalty, value: loyaltyScore },
          {
            label: "Content Saturation",
            weight: WEIGHTS.saturation,
            value: saturationScore,
          },
          {
            label: "Competition",
            weight: WEIGHTS.competition,
            value: competitionScore,
          },
        ];

        return {
          microNiche: micro,
          compositeScore: compositeScore * 100,
          interestCoverage,
          matchedSignals,
          scoreBreakdown,
        };
      },
    ).sort((a, b) => b.compositeScore - a.compositeScore);

    const averageCpm =
      CAREER_MOTIVATION_MICRO_NICHES.reduce((acc, micro) => {
        return acc + (micro.cpmRange[0] + micro.cpmRange[1]) / 2;
      }, 0) / CAREER_MOTIVATION_MICRO_NICHES.length;

    const averageTimeline =
      CAREER_MOTIVATION_MICRO_NICHES.reduce((acc, micro) => {
        return acc + micro.monetizationTimelineMonths;
      }, 0) / CAREER_MOTIVATION_MICRO_NICHES.length;

    return {
      scored,
      overview: {
        averageCpm,
        averageTimeline,
      },
    };
  }, [interestTokens, monetizationGoal, timeAvailability]);

  const recommended = analysis.scored[0];

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <h1>
            Career Motivation Opportunity Scanner
          </h1>
          <p>
            Intelligent niche selection for a motivational speech channel that
            targets profitable pockets of unmet demand within the career
            motivation space.
          </p>
        </div>
        <div className={styles.metrics}>
          <div className={styles.metricTile}>
            <span className={styles.metricLabel}>Baseline CPM</span>
            <strong>
              ${analysis.overview.averageCpm.toFixed(0)}
            </strong>
            <span className={styles.metricHint}>category midpoint</span>
          </div>
          <div className={styles.metricTile}>
            <span className={styles.metricLabel}>First Revenue ETA</span>
            <strong>
              ~{analysis.overview.averageTimeline.toFixed(1)} mo
            </strong>
            <span className={styles.metricHint}>average across micro-niches</span>
          </div>
        </div>
      </header>

      <section className={styles.panel}>
        <h2>Creator Profile Inputs</h2>
        <p className={styles.subheading}>
          Adjust these levers to stress-test which micro-niche delivers the
          fastest monetization path with durable audience retention.
        </p>
        <form className={styles.form} onSubmit={(event) => event.preventDefault()}>
          <label className={styles.inputGroup}>
            <span>Interests &amp; professional strengths</span>
            <textarea
              value={interests}
              onChange={(event) => setInterests(event.target.value)}
              rows={3}
              placeholder="e.g. fitness, business, mental health, finance"
            />
            <small>
              We map keywords against skill signals inside each micro-niche to
              estimate storytelling credibility.
            </small>
          </label>

          <label className={styles.inputGroup}>
            <span>Production bandwidth</span>
            <div className={styles.splitRow}>
              <select
                value={timeAvailability}
                onChange={(event) =>
                  setTimeAvailability(event.target.value as TimeAvailability)
                }
              >
                {TIME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className={styles.tag}>
                {TIME_LABELS[timeAvailability]} weekly runway
              </div>
            </div>
          </label>

          <label className={styles.inputGroup}>
            <span>Primary monetization goal</span>
            <select
              value={monetizationGoal}
              onChange={(event) =>
                setMonetizationGoal(event.target.value as MonetizationGoal)
              }
            >
              {MONETIZATION_GOALS.map((goal) => (
                <option key={goal} value={goal}>
                  {goal}
                </option>
              ))}
            </select>
          </label>
        </form>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Recommended Launch Micro-Niche</h2>
            <p className={styles.subheading}>
              Highest composite fit score based on inputs and market momentum.
            </p>
          </div>
          <div className={styles.scoreBubble}>
            <span className={styles.scoreValue}>
              {recommended.compositeScore.toFixed(1)}
            </span>
            <span className={styles.scoreSuffix}>
              ({scoreToLetter(recommended.compositeScore)})
            </span>
          </div>
        </div>

        <div className={styles.recommendation}>
          <div className={styles.recommendationBody}>
            <h3>{recommended.microNiche.name}</h3>
            <p>{recommended.microNiche.underservedAngle}</p>
            <div className={styles.badgeRow}>
              <span className={styles.tag}>
                {recommended.microNiche.competitionLevel} competition
              </span>
              <span className={styles.tag}>
                CPM {formatCurrencyRange(recommended.microNiche.cpmRange)}
              </span>
              <span className={styles.tag}>
                Trend {recommended.microNiche.searchTrend}
              </span>
            </div>
          </div>
          <aside className={styles.recommendationAside}>
            <div>
              <h4>Why it resonates</h4>
              <ul>
                <li>
                  {recommended.matchedSignals.length > 0
                    ? `Direct overlap with ${recommended.matchedSignals.join(", ")}`
                    : "Flexible narrative that welcomes your current strengths"}
                </li>
                <li>
                  Production intensity aligns with your {TIME_LABELS[timeAvailability]} time runway.
                </li>
                <li>
                  Monetization ceiling supports{" "}
                  {humanizeGoal(recommended.microNiche.monetizationCeiling)} targets.
                </li>
              </ul>
            </div>
            <div>
              <h4>Content architecture</h4>
              <ul>
                {recommended.microNiche.formatMix.map((format) => (
                  <li key={format}>{format}</li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <div className={styles.breakdownGrid}>
          {recommended.scoreBreakdown.map((item) => (
            <div key={item.label} className={styles.breakdownTile}>
              <span className={styles.breakdownLabel}>{item.label}</span>
              <strong>{Math.round(item.value * 100)}%</strong>
              <span className={styles.breakdownHint}>
                weight {Math.round(item.weight * 100)}%
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <h2>Micro-Niche Scoreboard</h2>
        <p className={styles.subheading}>
          Compare the full portfolio of opportunities across competition,
          monetization, and reliability signals.
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.scoreTable}>
            <thead>
              <tr>
                <th>Micro-Niche</th>
                <th>Competition</th>
                <th>CPM</th>
                <th>Trend</th>
                <th>Loyalty</th>
                <th>Saturation</th>
                <th>Monetization ETA</th>
                <th>Fit Score</th>
              </tr>
            </thead>
            <tbody>
              {analysis.scored.map((item) => (
                <tr key={item.microNiche.id}>
                  <td>
                    <div className={styles.tableName}>
                      <strong>{item.microNiche.name}</strong>
                      <span>{item.microNiche.underservedAngle}</span>
                    </div>
                  </td>
                  <td>{item.microNiche.competitionLevel}</td>
                  <td>{formatCurrencyRange(item.microNiche.cpmRange)}</td>
                  <td className={styles.tableTrend}>{item.microNiche.searchTrend}</td>
                  <td>{item.microNiche.audienceLoyalty}/10</td>
                  <td>{item.microNiche.contentSaturation}/10</td>
                  <td>{item.microNiche.monetizationTimelineMonths} mo</td>
                  <td>
                    <span className={styles.fitScore}>
                      {item.compositeScore.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>90-Day Execution Blueprint</h2>
        <div className={styles.blueprintGrid}>
          <div>
            <h3>Phase 1 · Weeks 1-3</h3>
            <ul>
              <li>Publish 9 short-form speeches refining the core niche promise.</li>
              <li>Validate hooks using YouTube Shorts CTR and 30s retention.</li>
              <li>Capture email opt-ins via actionable worksheets.</li>
            </ul>
          </div>
          <div>
            <h3>Phase 2 · Weeks 4-8</h3>
            <ul>
              <li>Ship 4 anchor long-form scripts layered with niche storytelling.</li>
              <li>Integrate community prompts driving comment velocity.</li>
              <li>Test midrolls and soft sponsorship pitches after week 6.</li>
            </ul>
          </div>
          <div>
            <h3>Phase 3 · Weeks 9-12</h3>
            <ul>
              <li>Launch guided challenge funnel (5-day sprint) tied to the niche.</li>
              <li>Package premium soundbeds or script templates for upsell.</li>
              <li>Negotiate niche-relevant affiliate bundles for CPM stacking.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>Key Monetization Levers</h2>
        <div className={styles.leverGrid}>
          <div>
            <h3>Premium Speech Packs</h3>
            <p>
              Bundle downloadable motivational scripts and guided visualization
              audio for mid-career audiences seeking repeatable confidence boosts.
            </p>
            <ul>
              <li>Launch price $29 with quarterly refresh cadence.</li>
              <li>Upsell coaching intensives or cohort-style accountability.</li>
              <li>Promote through end-screen CTAs and pinned comments.</li>
            </ul>
          </div>
          <div>
            <h3>Niche Sponsorships</h3>
            <p>
              Target career platforms, leadership bootcamps, and executive MBAs
              who need warm introductions to motivated professionals.
            </p>
            <ul>
              <li>Bundle Shorts + long-form reads for $350-$600 packages.</li>
              <li>Guarantee CPM uplift with conversion-optimized call-to-actions.</li>
              <li>Leverage email mini-briefings as added value.</li>
            </ul>
          </div>
          <div>
            <h3>Community Flywheel</h3>
            <p>
              Build a private circle for weekly live affirmations, accountability
              pairs, and hot seat coaching that compounds loyalty.
            </p>
            <ul>
              <li>$19/mo recurring with quarterly intensives as stretch goal.</li>
              <li>Use waitlist scarcity to fuel Shorts desirability.</li>
              <li>Track churn vs. motivational calendar cadence.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
