import { Layout } from "@/components/layout";
import { useGetChatMessages, useSendChatMessage, useGetTripById } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Send, Wifi, WifiOff } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@workspace/replit-auth-web";

type ChatMessage = {
  id: number;
  tripId: number;
  senderId: number;
  senderName: string | null;
  senderAvatarUrl: string | null;
  message: string;
  createdAt: string;
};

const API_WS_BASE = import.meta.env.DEV ? "ws://localhost:8080" : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;

export default function ChatThread() {
  const [, params] = useRoute("/chat/:id");
  const tripId = Number(params?.id);
  const { user } = useAuth();
  const { data: trip } = useGetTripById(tripId);
  const { data: initialMessages } = useGetChatMessages(tripId);
  const { mutate: sendMessage, isPending } = useSendChatMessage();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (initialMessages?.messages) {
      setMessages(initialMessages.messages as ChatMessage[]);
    }
  }, [initialMessages]);

  useEffect(() => {
    if (tripId) {
      localStorage.setItem(`chatLastSeen_${tripId}`, new Date().toISOString());
    }
  }, [tripId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const connectWs = useCallback(() => {
    if (!tripId || !user?.id) return;
    const url = `${API_WS_BASE}/ws/chat?tripId=${tripId}&userId=${user.id}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => {
      setWsConnected(false);
      reconnectTimeout.current = setTimeout(connectWs, 3000);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data);
        if (payload.type === "message" && payload.data) {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.data.id)) return prev;
            return [...prev, payload.data];
          });
        }
      } catch {}
    };
  }, [tripId, user?.id]);

  useEffect(() => {
    connectWs();
    return () => {
      clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connectWs]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const optimisticMsg: ChatMessage = {
      id: Date.now(),
      tripId,
      senderId: -1,
      senderName: user?.firstName || user?.username || "Vos",
      senderAvatarUrl: user?.profileImageUrl || null,
      message: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    const msgToSend = text.trim();
    setText("");
    sendMessage({ tripId, data: { message: msgToSend } }, {
      onSuccess: (serverMsg) => {
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? (serverMsg as unknown as ChatMessage) : m));
      },
      onError: () => {
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      },
    });
  };

  return (
    <Layout>
      <div className="flex flex-col h-screen max-h-[100dvh] bg-background pb-16">
        <header className="bg-card/90 backdrop-blur-md border-b border-border p-4 flex items-center gap-3 z-10">
          <Link href="/chat">
            <button className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base truncate">{trip?.origin} → {trip?.destination}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              {wsConnected
                ? <><Wifi className="w-3 h-3 text-green-500" /><span className="text-[10px] text-green-600 font-medium">En vivo</span></>
                : <><WifiOff className="w-3 h-3 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">Reconectando...</span></>
              }
            </div>
          </div>
          <div className="w-8 h-8 rounded-full overflow-hidden bg-muted border border-border">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${trip?.driverName}`}
              alt="Conductor"
              className="w-full h-full object-cover"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => {
            const isMe = msg.senderName === (user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : user?.username) || msg.senderId === -1;
            const showName = !isMe && (i === 0 || messages[i-1].senderId !== msg.senderId);
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                {!isMe && showName && (
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-muted shrink-0 mb-1">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderName}`} alt={msg.senderName || ""} className="w-full h-full object-cover" />
                  </div>
                )}
                {!isMe && !showName && <div className="w-7 shrink-0" />}
                <div className={`max-w-[78%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                  {showName && !isMe && <p className="text-[10px] font-bold mb-1 text-muted-foreground px-1">{msg.senderName}</p>}
                  <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border rounded-bl-sm"}`}>
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                  </div>
                  <p className={`text-[9px] mt-1 px-1 text-muted-foreground ${isMe ? "text-right" : "text-left"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="p-4 bg-card border-t border-border z-10 mb-safe">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Escribí un mensaje..."
              className="flex-1 rounded-full bg-muted/50"
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e as any); } }}
            />
            <Button type="submit" size="icon" className="rounded-full shrink-0" disabled={isPending || !text.trim()}>
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
