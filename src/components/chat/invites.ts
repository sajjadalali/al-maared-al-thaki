// What Sadeem's head says while the chat is closed: a short line every few
// seconds, chosen for who is looking. A new visitor is offered what Sadeem
// sells with; someone who left a conversation unfinished is offered that
// conversation back. Selling comes first, questions about the showroom last.
import { INVITES_OFF_KEY, STORE_KEY, VISIT_KEY } from "./chatKeys";

interface StoredMessage {
  role?: string;
  content?: string;
  cars?: unknown[];
}
interface StoredChat {
  updatedAt?: string;
  messages?: StoredMessage[];
}

export interface Visitor {
  /** Conversations were already in this browser when the visit began. */
  cameBack: boolean;
  /** The last thing they asked, in the conversation they touched last. */
  lastQuestion?: string;
  /** That conversation showed them cars. */
  sawCars: boolean;
}

const QUESTION_MAX = 34;

function unfinishedChat(): StoredChat | undefined {
  try {
    const store = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "null") as { chats?: StoredChat[] } | null;
    return (store?.chats ?? [])
      .filter((chat) => chat.messages?.some((m) => m.role === "user"))
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))[0];
  } catch {
    return undefined;
  }
}

/** Who is looking at the site, from what this browser has kept. */
export function readVisitor(): Visitor {
  const chat = unfinishedChat();
  let cameBack = false;
  try {
    // Decided once per visit, on its first page.
    const visit = window.sessionStorage.getItem(VISIT_KEY) ?? (chat ? "back" : "new");
    window.sessionStorage.setItem(VISIT_KEY, visit);
    cameBack = visit === "back";
  } catch {
    // blocked storage: treated as a first visit
  }
  const question = chat?.messages?.findLast((m) => m.role === "user")?.content?.trim().replace(/\s+/g, " ");
  return {
    cameBack,
    // Cut at a word, so the quote doesn't end on half of one.
    lastQuestion: question && (question.length > QUESTION_MAX ? `${question.slice(0, QUESTION_MAX).replace(/\s+\S*$/, "")}…` : question),
    sawCars: Boolean(chat?.messages?.some((m) => m.role === "assistant" && m.cars?.length)),
  };
}

/** The lines the head goes through, in order, for this visitor on this page. */
export function inviteLines(visitor: Visitor, onCarPage: boolean): string[] {
  const aboutThisCar = onCarPage ? ["عندك سؤال عن هاي السيارة؟ اسألني."] : [];
  if (visitor.lastQuestion) {
    return [
      visitor.cameBack ? "هلا بيك من جديد! نكمل من وين ما وگفنا؟" : "بعدني هنا. نكمل من وين ما وگفنا؟",
      `آخر شي سألتني: «${visitor.lastQuestion}». نكمل؟`,
      ...aboutThisCar,
      visitor.sawCars
        ? "عجبتك وحدة من السيارات اللي شفتها؟ أسجّلك على تجربة قيادة."
        : "گلّي ميزانيتك وأراويك اللي يناسبها من سياراتنا.",
      "أو نبدي من جديد: شنو السيارة اللي ببالك؟",
    ];
  }
  return [
    ...aboutThisCar,
    "هلا بيك! آني سديم، موظف المبيعات. شنو السيارة اللي تدوّر عليها؟",
    "گلّي ميزانيتك وأراويك اللي يناسبها من سياراتنا.",
    "محتار بين سيارتين؟ أقارنلك بيناتهن.",
    "تريد تجربة قيادة؟ دزلي رقمك والفريق يتصل بيك.",
    "وإذا عندك سؤال عن المعرض أو الدوام، هم اسألني.",
  ];
}

export function invitesOff(): boolean {
  try {
    return window.sessionStorage.getItem(INVITES_OFF_KEY) === "1";
  } catch {
    return false;
  }
}

export function turnInvitesOff() {
  try {
    window.sessionStorage.setItem(INVITES_OFF_KEY, "1");
  } catch {
    // blocked storage: they stay off for this page only
  }
}
