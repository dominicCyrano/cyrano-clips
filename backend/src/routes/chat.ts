import { Router } from "express";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SSEEvent } from "../../../shared/types.js";
import { getProjectDir, getProject } from "../services/storage.js";
import {
  getSessionId,
  persistSessionId,
} from "../services/claude-session.js";
import { buildSystemPrompt } from "../prompts/system.js";
import { buildBatchPrompt } from "../prompts/batch-system.js";
import { translateToSSE } from "../services/sse-helpers.js";

export const chatRouter = Router();

// POST /api/projects/:id/chat — SSE stream from Claude Agent SDK
chatRouter.post("/:id/chat", async (req, res) => {
  const projectId = req.params.id;
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const meta = await getProject(projectId);
  if (!meta) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const projectDir = getProjectDir(projectId);
  const sessionId = await getSessionId(projectId);

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const send = (event: SSEEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    const q = query({
      prompt: message,
      options: {
        cwd: projectDir,
        ...(sessionId ? { resume: sessionId } : {}),
        allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
        systemPrompt: {
          type: "preset" as const,
          preset: "claude_code" as const,
          append: meta.app_type === "batch"
            ? buildBatchPrompt(projectDir)
            : buildSystemPrompt(projectDir),
        },
        permissionMode: "bypassPermissions" as const,
        allowDangerouslySkipPermissions: true,
        model: "claude-sonnet-4-6",
        includePartialMessages: true,
        maxTurns: 30,
      },
    });

    for await (const msg of q) {
      const event = translateToSSE(msg, projectDir);
      if (event) send(event);

      // Persist session ID
      if ("session_id" in msg && msg.session_id) {
        await persistSessionId(projectId, msg.session_id);
      }
    }
  } catch (err: any) {
    send({ type: "error", message: err.message || "Unknown error" });
  }

  send({ type: "done" });
  res.end();
});

