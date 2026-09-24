import { spawn } from "node:child_process";
import * as readline from "node:readline";

export interface ProcessResult {
  stdout: string;
  stderr: string;
  code: number;
}

// Run a command and collect its stdout, stderr, and exit code
export function runProcess(
  command: string,
  args: string[],
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      resolve({
        stdout,
        stderr,
        code: code ?? -1,
      });
    });
  });
}

// Run a command while parsing its percentage output to report progress
export function runProcessWithProgress(
  command: string,
  args: string[],
  onProgress?: (percent: number) => void,
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => {
      const output = data.toString();
      stdout += output;

      const match = output.match(/(\d+\.?\d*)%/);
      if (match && onProgress) {
        onProgress(parseFloat(match[1]));
      }
    });

    child.stderr.on("data", (data: Buffer) => {
      const output = data.toString();
      stderr += output;

      const match = output.match(/(\d+\.?\d*)%/);
      if (match && onProgress) {
        onProgress(parseFloat(match[1]));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      resolve({
        stdout,
        stderr,
        code: code ?? -1,
      });
    });
  });
}

// Ask the user a question and resolve their trimmed answer
export function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Ask a download confirmation (y/n) until a valid answer is given
export async function confirmDownload(question: string): Promise<boolean> {
  while (true) {
    const answer = (await promptUser(question)).toLowerCase();
    if (answer === "y") return true;
    if (answer === "n") return false;
    // Re-prompt when the user enters anything other than y or n
    console.log("invalid input: please enter y or n");
  }
}
