import { CHARACTER_LIMIT } from "./constants.js";

export function jsonResult(data: unknown) {
  const text = JSON.stringify(data, null, 2);
  if (text.length > CHARACTER_LIMIT) {
    return {
      isError: true as const,
      content: [{
        type: "text" as const,
        text: `Result is ${text.length} characters, over the ${CHARACTER_LIMIT} limit. Retry with a smaller page_size, a narrower filter, or a 'fields' mask.`
      }]
    };
  }
  return { content: [{ type: "text" as const, text }] };
}
