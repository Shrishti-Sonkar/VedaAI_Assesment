import type { Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import type { JobUpdate } from "./types.js";

const subscribers = new Map<string, Set<WebSocket>>();

export function attachRealtime(server: Server) {
  const wss = new WebSocketServer({ server });
  wss.on("connection", (socket, request) => {
    const url = new URL(request.url || "", "http://localhost");
    const assignmentId = url.searchParams.get("assignmentId");
    if (!assignmentId) {
      socket.close(1008, "assignmentId required");
      return;
    }
    const set = subscribers.get(assignmentId) || new Set<WebSocket>();
    set.add(socket);
    subscribers.set(assignmentId, set);
    socket.on("close", () => {
      set.delete(socket);
      if (!set.size) subscribers.delete(assignmentId);
    });
  });
}

export function publishUpdate(update: JobUpdate) {
  const payload = JSON.stringify(update);
  subscribers.get(update.assignmentId)?.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) socket.send(payload);
  });
}
