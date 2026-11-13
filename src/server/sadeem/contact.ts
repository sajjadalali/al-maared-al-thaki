// The message the chat's WhatsApp button starts, for the LLM Sadeem and the
// rule-based one alike.

/** In the buyer's own Iraqi words; a car only when they picked that one car. */
export function contactMessage(car: string | undefined, about: "question" | "test_drive" = "question"): string {
  if (!car) return "هلا، عندي سؤال";
  return about === "test_drive" ? `هلا، أريد أحجز تجربة قيادة على ${car}` : `هلا، أريد أسأل عن ${car}`;
}
