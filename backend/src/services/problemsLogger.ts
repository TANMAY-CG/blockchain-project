import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

const LOCAL_FILE = path.resolve(process.cwd(), 'sealed-problems.log.jsonl');

type ProblemSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export async function logProblem(input: {
  where: string;
  how: string;
  error: string;
  severity?: ProblemSeverity;
}) {
  const problem = {
    when: new Date().toISOString(),
    where: input.where,
    how: input.how,
    severity: input.severity ?? 'Medium',
    error: input.error,
  };

  try {
    fs.appendFileSync(LOCAL_FILE, `${JSON.stringify(problem)}\n`, 'utf8');
  } catch {
    // ignore local log failures
  }

  try {
    await axios.post(env.SEALED_PROBLEMS_URL, problem, { timeout: 2500 });
  } catch {
    // do not throw; logging must never break request flow
  }
}

