import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogWithMessages, Message } from "@/types/dialog";
import { useAuth } from "./useAuth";

export function useDialogs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDialogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadDialogs = () => {
    setLoading(true);
    try {
      const savedDialogs = localStorage.getItem(`fe-dialogs-${user?.id}`);
      if (savedDialogs) {
        setDialogs(JSON.parse(savedDialogs));
      }
    } catch (error) {
      console.error("Failed to load dialogs:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Создать новый диалог (вызов только при первом сообщении пользователя!)
   */
  const createDialog = (initialMessage: string): Dialog => {
    if (!user) throw new Error("No user found");

    const newDialog: Dialog = {
      id: crypto.randomUUID(),
      title:
        initialMessage.length > 50
          ? initialMessage.substring(0, 50) + "..."
          : initialMessage,
      userId: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedDialogs = [newDialog, ...dialogs];
    setDialogs(updatedDialogs);
    localStorage.setItem(
      `fe-dialogs-${user.id}`,
      JSON.stringify(updatedDialogs)
    );

    return newDialog;
  };

  const updateDialog = (dialogId: string, updates: Partial<Dialog>) => {
    const updatedDialogs = dialogs.map((dialog) =>
      dialog.id === dialogId
        ? { ...dialog, ...updates, updatedAt: new Date().toISOString() }
        : dialog
    );
    setDialogs(updatedDialogs);
    localStorage.setItem(
      `fe-dialogs-${user?.id}`,
      JSON.stringify(updatedDialogs)
    );
  };

  const deleteDialog = (dialogId: string) => {
    const updatedDialogs = dialogs.filter((dialog) => dialog.id !== dialogId);
    setDialogs(updatedDialogs);
    localStorage.setItem(
      `fe-dialogs-${user?.id}`,
      JSON.stringify(updatedDialogs)
    );

    // удалить только сообщения конкретного диалога
    localStorage.removeItem(`fe-messages-${dialogId}`);
  };

  const getDialogWithMessages = (
    dialogId: string
  ): DialogWithMessages | null => {
    const dialog = dialogs.find((d) => d.id === dialogId);
    if (!dialog) return null;

    const savedMessages = localStorage.getItem(`fe-messages-${dialogId}`);
    const messages: Message[] = savedMessages ? JSON.parse(savedMessages) : [];

    return { ...dialog, messages };
  };

  /**
   * Добавить сообщение в конкретный диалог
   * Если диалога нет — создаём (только если role === "user")
   */
  const addMessage = (
    dialogId: string | null,
    content: string,
    role: "user" | "assistant"
  ): Message => {
    let targetDialog: Dialog | undefined;

    if (!dialogId) {
      if (role === "user") {
        targetDialog = createDialog(content);
        dialogId = targetDialog.id;
      } else {
        throw new Error(
          "Нельзя добавить сообщение ассистента без существующего диалога"
        );
      }
    } else {
      targetDialog = dialogs.find((d) => d.id === dialogId);
      if (!targetDialog) {
        if (role === "user") {
          targetDialog = createDialog(content);
          dialogId = targetDialog.id;
        } else {
          throw new Error("Диалог не найден для ответа ассистента");
        }
      }
    }

    const message: Message = {
      id: crypto.randomUUID(),
      dialogId,
      content,
      role,
      timestamp: new Date().toISOString(),
    };

    const savedMessages = localStorage.getItem(`fe-messages-${dialogId}`);
    const messages: Message[] = savedMessages ? JSON.parse(savedMessages) : [];
    const updatedMessages = [...messages, message];

    localStorage.setItem(
      `fe-messages-${dialogId}`,
      JSON.stringify(updatedMessages)
    );

    return message;
  };

  return {
    dialogs,
    loading,
    createDialog,
    updateDialog,
    deleteDialog,
    getDialogWithMessages,
    addMessage,
  };
}
