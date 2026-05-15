/**
 * THE DELUSION METER ENGINE v1.0
 * 
 * Grades projects based on "Strategic Viability" vs. "Feature Abyss".
 */

export type RatingTier = 'corpse' | 'sweetspot' | 'abyss' | 'delusion';

export interface DiagnosticResult {
  score: number;
  tier: RatingTier;
  verdict: string;
  analysis: string;
  mutation: string;
}

export class DelusionMeter {
  /**
   * Calculates the Delusion Score based on Theory vs. Reality.
   * @param realityScore 0-100 (Based on functional code, commits, tests)
   * @param illusionScore 0-100 (Based on wild prompts, specs, unimplemented ideas)
   */
  static calculate(realityScore: number, illusionScore: number): DiagnosticResult {
    // The Delusion Score is the delta amplified by the ambition (illusion)
    const rawScore = Math.min(100, Math.max(0, illusionScore - (realityScore * 0.5)));
    
    let tier: RatingTier = 'corpse';
    let verdict = '';
    let analysis = '';
    let mutation = '';

    if (rawScore >= 96) {
      tier = 'delusion';
      verdict = 'TOTAL TIMELINE EXTINCTION';
      analysis = 'You are trying to build a self-healing, multi-agent virtual ecosystem. Brilliant, but you are not shipping this year.';
      mutation = 'Inject a neural-interface layer that maps social media sentiment to local hardware voltages.';
    } else if (rawScore >= 71) {
      tier = 'abyss';
      verdict = 'AGGRESSIVELY OVER-SCOPED';
      analysis = 'The idea is incredible, but the execution pipeline is currently a nightmare. Needs optimization before it kills the timeline.';
      mutation = 'Bridge the gap by converting your high-fidelity UI into a retro pixel engine to hide the logic gaps.';
    } else if (rawScore >= 31) {
      tier = 'sweetspot';
      verdict = 'CONTROLLED DRIFT';
      analysis = 'Your project fulfills its primary function but includes high-leverage, non-linear features. This is the optimal shipping zone.';
      mutation = 'Add a hand-drawn infinite sketchbook layer to your data visualizer.';
    } else {
      tier = 'corpse';
      verdict = 'THE CODE CORPSE';
      analysis = 'Under-scoped and sterile. The project is hyper-predictable boilerplate. It works, but it has zero soul.';
      mutation = 'Force a cross-domain collision: smash your code against retro physics or blockchain forensics.';
    }

    return {
      score: Math.round(rawScore),
      tier,
      verdict,
      analysis,
      mutation
    };
  }
}
