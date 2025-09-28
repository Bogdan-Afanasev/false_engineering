import { Navigate, useParams } from "react-router-dom";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { useAuth } from "@/hooks/useAuth";
import { useDialogs } from "@/hooks/useDialogs";

export default function SearchPage() {
  const { user } = useAuth();
  const { dialogId } = useParams<{ dialogId: string }>();
  const dialogsApi = useDialogs();

  if (!user?.isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="h-screen flex">
      <ChatSidebar dialogsApi={dialogsApi} />
      <ChatInterface dialogId={dialogId} dialogsApi={dialogsApi} />
    </div>
  );
}
