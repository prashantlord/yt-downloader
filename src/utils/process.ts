import { spawn } from "node:child_process";
import * as readline from "node:readline";

export interface ProcessResult {
  stdout: string;
  stderr: string;
  code: number;
}

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
