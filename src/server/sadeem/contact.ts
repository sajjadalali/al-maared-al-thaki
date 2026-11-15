// The message the chat's WhatsApp button starts, for the LLM Sadeem and the
// rule-based one alike.

export type ContactPurpose = "question" | "test_drive" | "buy";

/** In the buyer's own Iraqi words; a car only when they picked that one car. */
export function contactMessage(car: string | undefined, about: ContactPurpose = "question"): string {
  if (!car) return "هلا، عندي سؤال";
  if (about === "buy") return `هلا، أريد أشتري ${car}`;
  return about === "test_drive" ? `هلا، أريد أحجز تجربة قيادة على ${car}` : `هلا، أريد أسأل عن ${car}`;
}
