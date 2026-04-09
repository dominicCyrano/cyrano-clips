import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import type { Transcript } from "../../../shared/types.js";

const DEFAULT_LANGUAGE = "en";
const JSON_MARKER = "__CYRANO_TRANSCRIPT_JSON__";
const TRANSCRIBE_SCRIPT = fileURLToPath(
  new URL("../../../modal/transcribe.py", import.meta.url)
);

function buildArgs(audioPath: string, language: string) {
  return [TRANSCRIBE_SCRIPT, "--audio", audioPath, "--language", language];
}

export async function transcribeAudio(
  audioPath: string,
  language = DEFAULT_LANGUAGE
): Promise<Transcript> {
  const pythonBin = process.env.PYTHON_BIN || "python";

  return new Promise((resolve, reject) => {
    const proc = spawn(pythonBin, buildArgs(audioPath, language), {
      cwd: path.dirname(TRANSCRIBE_SCRIPT),
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => {
      reject(
        new Error(
          `Failed to start transcription process: ${err.message}`
        )
      );
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Transcription process exited with code ${code}: ${stderr.trim() || stdout.trim() || "no output"}`
          )
        );
        return;
      }

      try {
        const payload = stdout.includes(JSON_MARKER)
          ? stdout.slice(stdout.lastIndexOf(JSON_MARKER) + JSON_MARKER.length)
          : stdout;
        resolve(JSON.parse(payload.trim()) as Transcript);
      } catch (err: any) {
        reject(
          new Error(
            `Transcription output was not valid JSON: ${err.message}`
          )
        );
      }
    });
  });
}
