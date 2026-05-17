/**
 * Pure scoring logic — zero Node deps. Safe to bundle in the browser
 * and in Cloudflare Workers.
 */

import type { DiagnosticResult, RatingTier } from "./types";

export class DelusionMeter {
  /**
   * Compute a `DiagnosticResult` from reality / illusion components.
   * Delusion is amplified by ambition: `min(100, illusion - reality * 0.5)`.
   */
  static calculate(
    realityScore: number,
    illusionScore: number
  ): DiagnosticResult {
    const rawScore = Math.min(
      100,
      Math.max(0, illusionScore - realityScore * 0.5)
    );

    let tier: RatingTier;
    let verdict: string;
    let analysis: string;
    let mutation: string;

    if (rawScore >= 96) {
      tier = "delusion";
      verdict = "TOTAL TIMELINE EXTINCTION";
      analysis =
        "You are trying to build a self-healing, multi-agent virtual ecosystem. Brilliant, but you are not shipping this year.";
      mutation =
        "Inject a neural-interface layer that maps social media sentiment to local hardware voltages.";
    } else if (rawScore >= 71) {
      tier = "abyss";
      verdict = "AGGRESSIVELY OVER-SCOPED";
      analysis =
        "The idea is incredible, but the execution pipeline is currently a nightmare. Needs optimization before it kills the timeline.";
      mutation =
        "Bridge the gap by converting your high-fidelity UI into a retro pixel engine to hide the logic gaps.";
    } else if (rawScore >= 31) {
      tier = "sweetspot";
      verdict = "CONTROLLED DRIFT";
      analysis =
        "Your project fulfills its primary function but includes high-leverage, non-linear features. This is the optimal shipping zone.";
      mutation =
        "Add a hand-drawn infinite sketchbook layer to your data visualizer.";
    } else {
      tier = "corpse";
      verdict = "THE CODE CORPSE";
      analysis =
        "Under-scoped and sterile. The project is hyper-predictable boilerplate. It works, but it has zero soul.";
      mutation =
        "Force a cross-domain collision: smash your code against retro physics or blockchain forensics.";
    }

    return {
      score: Math.round(rawScore),
      tier,
      verdict,
      analysis,
      mutation,
      realityScore: Math.round(realityScore),
      illusionScore: Math.round(illusionScore),
    };
  }
}
