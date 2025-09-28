import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  PenSquare,
  MoreHorizontal,
  Trash2,
  Edit,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { Dialog as DialogType } from "@/types/dialog";
import { useDialogs } from "@/hooks/useDialogs";

interface ChatSidebarProps {
  dialogsApi: ReturnType<typeof useDialogs>;
}

export function ChatSidebar({ dialogsApi }: ChatSidebarProps) {
  const { user, logout } = useAuth();
  const { dialogs, updateDialog, deleteDialog } = dialogsApi;
  const navigate = useNavigate();
  const location = useLocation();
  const [editingDialog, setEditingDialog] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);

  // Settings modal state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleNewChat = () => {
    navigate(`/search/?model=auto`);
  };

  const handleDialogClick = (dialogId: string) => {
    navigate(`/search/dialog/${dialogId}`);
  };

  const startEdit = (dialog: DialogType) => {
    setEditingDialog(dialog.id);
    setEditTitle(dialog.title);
  };

  const saveEdit = () => {
    if (editingDialog && editTitle.trim()) {
      updateDialog(editingDialog, { title: editTitle.trim() });
    }
    setEditingDialog(null);
    setEditTitle("");
  };

  const handleDelete = (dialogId: string) => {
    deleteDialog(dialogId);
    setDeleteDialogId(null);

    if (location.pathname.includes(dialogId)) {
      navigate("/search");
    }
  };

  const getCurrentDialogId = () => {
    const match = location.pathname.match(/\/search\/dialog\/(.+)/);
    return match ? match[1] : null;
  };

  const currentDialogId = getCurrentDialogId();

  return (
    <div className="w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div
          onClick={handleNewChat}
          className="flex items-center gap-2 mb-4 cursor-pointer hover:bg-sidebar-accent rounded-lg p-2"
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">
              FE
            </span>
          </div>
          <span className="font-semibold text-sidebar-foreground">
            False Engineering
          </span>
        </div>

        <Button
          onClick={handleNewChat}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <PenSquare className="h-4 w-4" />
          Новый чат
        </Button>
      </div>

      {/* Dialogs list */}
      <div className="flex-1 overflow-y-auto p-2">
        {dialogs.map((dialog) => (
          <div key={dialog.id} className="group relative">
            {editingDialog === dialog.id ? (
              <div className="p-2">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") {
                      setEditingDialog(null);
                      setEditTitle("");
                    }
                  }}
                  autoFocus
                  className="text-sm"
                />
              </div>
            ) : (
              <div
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                  currentDialogId === dialog.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                }`}
                onClick={() => handleDialogClick(dialog.id)}
              >
                <div className="flex-1 truncate text-sm">{dialog.title}</div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => startEdit(dialog)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Переименовать
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteDialogId(dialog.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* User menu */}
      {user && (
        <div className="p-4 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 p-2"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-purple-600 text-white">
                    {user.fullName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">{user.fullName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Настройки
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Settings modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Настройки</DialogTitle>
            <DialogDescription>Выберите тему оформления</DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={theme ?? "system"}
            onValueChange={(v: string) =>
              setTheme(v as "light" | "dark" | "system")
            }
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="light" />
              <span>Светлая</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <RadioGroupItem value="dark" />
              <span>Тёмная</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <RadioGroupItem value="system" />
              <span>Системная (по умолчанию)</span>
            </div>
          </RadioGroup>
          <DialogFooter>
            <Button onClick={() => setSettingsOpen(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteDialogId}
        onOpenChange={() => setDeleteDialogId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить диалог?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Диалог и все сообщения будут удалены
              навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialogId && handleDelete(deleteDialogId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
