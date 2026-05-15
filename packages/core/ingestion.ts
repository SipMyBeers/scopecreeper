import axios from 'axios';
import Database from 'better-sqlite3';
import { DelusionMeter, DiagnosticResult } from './index.js';

export interface RepoStats {
  stars: number;
  forks: number;
  commits: number;
  fileCount: number;
  languages: string[];
}

export class IngestionEngine {
  private db: Database.Database;

  constructor(dbPath: string = 'scopecreeper.db') {
    this.db = new Database(dbPath);
    this.initDb();
  }

  private initDb() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT,
        url TEXT,
        reality_score INTEGER,
        illusion_score INTEGER,
        delusion_score INTEGER,
        tier TEXT,
        last_scan DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Scans a GitHub repo to calculate a "Reality Score" (0-100)
   * based on activity, complexity, and stability.
   */
  async scanGitHub(repoUrl: string): Promise<number> {
    try {
      const [, , , owner, repo] = repoUrl.split('/');
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
      
      // Fetch repo metadata
      const { data } = await axios.get(apiUrl);
      
      // Basic Reality Heuristic:
      // - Stars/Forks indicate social validation
      // - Size/File count indicates complexity
      // - Age/Update frequency indicates stability
      
      const starWeight = Math.min(20, (data.stargazers_count / 100) * 5);
      const sizeWeight = Math.min(30, (data.size / 1000) * 2);
      const forksWeight = Math.min(20, (data.forks_count / 10) * 2);
      
      // Mocked commit weight (requires separate API call)
      const activityWeight = data.pushed_at ? 30 : 10;

      const realityScore = Math.round(starWeight + sizeWeight + forksWeight + activityWeight);
      return Math.min(100, realityScore);
    } catch (error) {
      console.error('GitHub Ingestion Failed:', error);
      return 10; // Default "Code Corpse" reality for failed scans
    }
  }

  /**
   * Analyzes a project and saves it to the local SQLite store.
   */
  async processProject(name: string, url: string, rawIllusion: string): Promise<DiagnosticResult> {
    const realityScore = await this.scanGitHub(url);
    
    // Illusion Score Heuristic: 
    // Higher length and specific "insane" keywords increase illusion score.
    const illusionKeywords = ['opus 5.0', 'world peace', 'neural', 'self-healing', 'infinite', 'multimodal'];
    let illusionScore = 20 + Math.min(40, rawIllusion.length / 50);
    
    illusionKeywords.forEach(word => {
      if (rawIllusion.toLowerCase().includes(word)) illusionScore += 15;
    });

    const result = DelusionMeter.calculate(realityScore, Math.min(100, illusionScore));

    this.db.prepare(`
      INSERT OR REPLACE INTO projects (id, name, url, reality_score, illusion_score, delusion_score, tier)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(url, name, url, realityScore, Math.round(illusionScore), result.score, result.tier);

    return result;
  }

  getProjects() {
    return this.db.prepare('SELECT * FROM projects ORDER BY last_scan DESC').all();
  }
}
