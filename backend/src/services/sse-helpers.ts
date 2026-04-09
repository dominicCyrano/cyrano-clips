import path from "path";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { SSEEvent } from "../../../shared/types.js";

export function translateToSSE(
  msg: SDKMessage,
  projectDir: string
): SSEEvent | null {
  switch (msg.type) {
    case "stream_event": {
      const event = msg.event;
      if (
        event.type === "content_block_delta" &&
        "delta" in event &&
        event.delta.type === "text_delta"
      ) {
        return { type: "text_delta", content: (event.delta as any).text };
      }
      return null;
    }

    case "assistant": {
      const content = msg.message?.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "tool_use") {
            const label = describeToolUse(
              block.name,
              block.input as Record<string, any>,
              projectDir
            );
            return {
              type: "activity_start",
              id: block.id,
              tool: block.name,
              label,
            };
          }
        }
      }
      return null;
    }

    case "tool_progress": {
      return {
        type: "tool_progress",
        id: msg.tool_use_id,
        tool: msg.tool_name,
        elapsed: msg.elapsed_time_seconds,
      };
    }

    case "tool_use_summary": {
      return { type: "tool_summary", summary: msg.summary };
    }

    case "result": {
      if (msg.subtype === "success") {
        return {
          type: "result",
          cost: msg.total_cost_usd,
          turns: msg.num_turns,
          text: msg.result,
        };
      } else {
        const errors = (msg as any).errors;
        return {
          type: "error",
          message: Array.isArray(errors)
            ? errors.join("; ")
            : `Error: ${msg.subtype}`,
        };
      }
    }

    default:
      return null;
  }
}

export function describeToolUse(
  tool: string,
  input: Record<string, any>,
  projectDir: string
): string {
  const formatPath = (filePath?: string) => {
    if (!filePath) return "file";

    const normalizedProjectDir = path.normalize(projectDir);
    const normalizedFilePath = path.normalize(filePath);
    if (normalizedFilePath.startsWith(normalizedProjectDir)) {
      return path.relative(normalizedProjectDir, normalizedFilePath);
    }

    return path.basename(normalizedFilePath);
  };

  switch (tool) {
    case "Read": {
      const file = formatPath(input.file_path);
      if (file === "transcripts/transcript.json") return "Reviewing transcript";
      if (file === "transcripts/speaker_map.json")
        return "Checking speaker names";
      if (file.startsWith("timelines/")) return "Reviewing current timeline";
      return `Reading ${file}`;
    }
    case "Write": {
      const file = formatPath(input.file_path);
      if (file.startsWith("timelines/")) return "Saving timeline";
      if (file.startsWith("exports/")) return "Writing export artifact";
      if (file === "route-decision.json") return "Preparing routing";
      return `Writing ${file}`;
    }
    case "Edit": {
      const file = formatPath(input.file_path);
      if (file.startsWith("timelines/")) return "Updating timeline";
      return `Editing ${file}`;
    }
    case "Bash": {
      const command = String(input.command || "");
      if (/ffprobe/i.test(command)) return "Inspecting media metadata";
      if (/ffmpeg/i.test(command)) return "Rendering with FFmpeg";
      if (/grep|rg|findstr/i.test(command)) return "Scanning transcript";
      if (/wc|measure-object|head|tail|sed/i.test(command)) {
        return "Inspecting source material";
      }
      return `Running ${command.slice(0, 40) || "command"}`;
    }
    case "Glob":
      return "Scanning project files";
    case "Grep":
      return "Searching transcript";
    default:
      return `Using ${tool}`;
  }
}
