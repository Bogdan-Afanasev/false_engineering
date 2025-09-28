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
  dialogsApi: ReturnType<typeof useDialogs>;
}

export function ChatInterface({ dialogId, dialogsApi }: ChatInterfaceProps) {
  const { user } = useAuth();
  const { getDialogWithMessages, addMessage } = dialogsApi;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDialogId, setCurrentDialogId] = useState<string | null>(
    dialogId ?? null
  );

  const { toast } = useToast();

  const handleMicClick = () => {
    toast({
      title: "Скоро появится 🎤",
      description:
        "Возможность отправлять голосовые сообщения будет добавлена в будущих обновлениях.",
    });
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  // следим за сменой dialogId из роутера
  useEffect(() => {
    setCurrentDialogId(dialogId ?? null);
  }, [dialogId]);

  // обновляем список сообщений при смене диалога
  useEffect(() => {
    if (!currentDialogId) {
      setMessages([]);
      return;
    }
    const dialogWithMessages = getDialogWithMessages(currentDialogId);
    setMessages(dialogWithMessages ? dialogWithMessages.messages : []);
  }, [currentDialogId, getDialogWithMessages]);

  // автоскролл
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // имитация ответа ассистента
  const mockAIResponse = async (userQuery: string): Promise<string> => {
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 2000)
    );
    return `Ответ на: ${userQuery}`;
  };

  // автоответ ассистента
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

  // отправка сообщения пользователем
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessageText = input.trim();
    setInput("");

    const newUserMessage = addMessage(currentDialogId, userMessageText, "user");
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
      handleSubmit(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.role === "assistant" && (
              <Avatar className="h-8 w-8 mt-1">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  FE
                </AvatarFallback>
              </Avatar>
            )}

            <div
              className={`max-w-[70%] p-3 rounded-lg ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">
                {message.content}
              </div>
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
              <Avatar className="h-8 w-8 mt-1">
                <AvatarFallback className="text-xs">
                  {user.fullName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <Avatar className="h-8 w-8 mt-1">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                FE
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
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

      {/* Инпут с иконками */}
      <div className="p-4">
        <div className="max-w-3xl w-full mx-auto">
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

              {/* Иконки справа */}
              <div className="flex items-center gap-1 pr-2">
                {/* Mic */}
                <Button
                  type="button"
                  onClick={handleMicClick}
                  size="icon"
                  className="h-9 w-9 transition-colors hover:bg-purple-100 hover:text-purple-600 rounded-full opacity-50 cursor-not-allowed"
                >
                  <Mic className="h-4 w-4" />
                </Button>

                {/* Отправить */}
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading}
                  className={`h-9 w-9 rounded-full transition-transform duration-200 ${
                    input.trim() ? "" : "rotate-45"
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
