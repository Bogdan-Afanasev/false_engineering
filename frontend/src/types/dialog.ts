export interface Dialog {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  dialogId: string;
  content: string;
  role: "user" | "assistant";
  timestamp: string;
}

export interface DialogWithMessages extends Dialog {
  messages: Message[];
}
