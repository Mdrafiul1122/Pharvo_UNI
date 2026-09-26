import { request } from "./api";

export function askPharvoAI(text) {
  return request("/ai/query/", {
    method: "POST",
    body: { text },
  });
}
