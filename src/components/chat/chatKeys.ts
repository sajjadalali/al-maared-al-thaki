// Storage keys shared by the chat store and the launcher. Kept apart from the
// store so the launcher (on every page) doesn't pull the chat's code with it.

/** The visitor's conversations (localStorage). */
export const STORE_KEY = "autopro:chats";
/** How this visit began: "back" if conversations were already here, else "new" (sessionStorage). */
export const VISIT_KEY = "autopro:visit";
/** The visitor closed Sadeem's invitations for this visit (sessionStorage). */
export const INVITES_OFF_KEY = "autopro:invites-off";
