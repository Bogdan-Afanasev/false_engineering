import { useState, useRef, useEffect } from "react";
import { Send, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useDialogs } from "@/hooks/useDialogs";
import { Message } from "@/types/dialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

interface ChatInterfaceProps {
  dialogId?: string;
  dialogsApi?: ReturnType<typeof useDialogs>;
}

export function ChatInterface({ dialogId, dialogsApi }: ChatInterfaceProps) {
  const { user } = useAuth();
  const localDialogsApi = useDialogs();
  const { getDialogWithMessages, addMessage } = dialogsApi ?? localDialogsApi;

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDialogId, setCurrentDialogId] = useState<string | null>(
    dialogId ?? null
  );

  const { toast } = useToast();
  const navigate = useNavigate();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCurrentDialogId(dialogId ?? null);
  }, [dialogId]);

  useEffect(() => {
    if (!currentDialogId) {
      setMessages([]);
      return;
    }
    const dialogWithMessages = getDialogWithMessages(currentDialogId);
    setMessages(dialogWithMessages ? dialogWithMessages.messages : []);
  }, [currentDialogId, getDialogWithMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMicClick = () => {
    toast({
      title: "Скоро появится 🎤",
      description:
        "Возможность отправлять голосовые сообщения будет добавлена в будущих обновлениях.",
    });
  };

    const mockAIResponse = async (userQuery: string): Promise<string> => {
        try {
            const response = await fetch("http://127.0.0.1:8000/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: userQuery,
                    username: user?.username
                }),
            });

            const data = await response.json();
            if (data.success) {
                if (Array.isArray(data.result)) {
                    return data.result.map(row => JSON.stringify(row)).join("\n");
                } else if (typeof data.result === "object") {
                    return JSON.stringify(data.result);
                } else {
                    return String(data.result);
                }
            } else {
                return `Ошибка: ${data.error}`;
            }
        } catch (err) {
            return `Ошибка подключения к серверу: ${err}`;
        }
    };

    useEffect(() => {
        if (!currentDialogId || isLoading) return;
        if (messages.length === 0) return;

        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === "user") {
            (async () => {
                setIsLoading(true);
                const aiResponse = await mockAIResponse(lastMessage.content);
                addMessage(currentDialogId, aiResponse, "assistant");

                const updatedDialog = getDialogWithMessages(currentDialogId);
                setMessages(updatedDialog ? updatedDialog.messages : []);
                setIsLoading(false);
            })();
        }
    }, [messages, currentDialogId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const text = input.trim();
    setInput("");

    const newUserMessage = addMessage(currentDialogId, text, "user");
    const targetDialogId = newUserMessage.dialogId;

    setCurrentDialogId(targetDialogId);

    if (!dialogId) {
      navigate(`/search/dialog/${targetDialogId}`);
    }

    const dialog = getDialogWithMessages(targetDialogId);
    setMessages(dialog ? dialog.messages : [newUserMessage]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Список сообщений */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[1200px] w-full mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`w-full flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex items-start mr-2">
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      FE
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}

              <div
                className={`inline-block max-w-[70%] p-3 rounded-lg whitespace-pre-wrap overflow-hidden [overflow-wrap:anywhere] ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="text-sm">{message.content}</div>
                <div
                  className={`text-xs mt-1 opacity-70 ${
                    message.role === "user"
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              {message.role === "user" && user && (
                <div className="flex items-start ml-2">
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="text-xs">
                      {user.fullName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="w-full flex justify-start">
              <div className="flex items-start mr-2">
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    FE
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="inline-flex max-w-[65%] p-3 rounded-lg bg-muted">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
          {!currentDialogId && (
            <div className="text-center text-muted-foreground mt-6">
              Напишите сообщение, чтобы начать новый диалог
            </div>
          )}
        </div>
      </div>

      {/* Инпут */}
      <div className="p-4">
        <div className="max-w-[1200px] w-full mx-auto">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <div className="flex items-center flex-1 border rounded-2xl overflow-hidden bg-background">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Задайте вопрос..."
                className="flex-1 resize-none border-0 focus-visible:ring-0 focus-visible:outline-none p-3 min-h-[44px] max-h-[150px] leading-6"
                disabled={isLoading}
              />

              <div className="flex items-center gap-1 pr-2">
                <Button
                  type="button"
                  onClick={handleMicClick}
                  size="icon"
                  className="h-9 w-9 transition-colors hover:bg-purple-100 hover:text-purple-600 rounded-full opacity-70"
                >
                  <Mic className="h-4 w-4" />
                </Button>

                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading}
                  className={`h-9 w-9 rounded-full transition-transform duration-200 ${
                    input.trim()
                      ? "rotate-0 opacity-100"
                      : "rotate-45 opacity-50"
                  }`}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
