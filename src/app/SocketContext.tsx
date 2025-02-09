"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const socketUrl = process.env.NEXT_PUBLIC_SERVER_URL || "";
console.log("SERVER LINK ==>", socketUrl);

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  dataStock: any[];
  dataCall: any[];
  dataPut: any[];
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  dataStock: [],
  dataCall: [],
  dataPut: [],
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [dataStock, setDataStock] = useState<any[]>([]);
  const [dataCall, setDataCall] = useState<any[]>([]);
  const [dataPut, setDataPut] = useState<any[]>([]);

  useEffect(() => {
    const newSocket = io(socketUrl, {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 5000,
      withCredentials: true,
    });

    newSocket.on("connect", () => {
      console.log("✅ Connected to Socket.io:", newSocket.id);
      newSocket.emit("customEvent", { message: "Hello from Next.js!" });

      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Disconnected from Socket.io");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("⚠️ Connection Error:", error.message);
    });

    newSocket.on("reconnect_attempt", (attempt) => {
      console.log(`🔄 Reconnection Attempt #${attempt}`);
    });

    console.log("📡 Subscribing to socket events...");

    // ✅ Event Handlers
    const handleUpdateCalls = (data: any) => {
      console.log("📢 Received updateOptionCalls:", data);
      setDataCall(data);
    };

    const handleUpdatePuts = (data: any) => {
      console.log("📢 Received updateOptionPuts:", data);
      setDataPut(data);
    };

    const handleUpdateData = (data: any) => {
      console.log("📢 Received updateData:", data);
      setDataStock(data);
    };

    // ✅ Register event listeners
    newSocket.on("updateOptionCalls", handleUpdateCalls);
    newSocket.on("updateOptionPuts", handleUpdatePuts);
    newSocket.on("updateData", handleUpdateData);

    setSocket(newSocket);

    // ✅ Cleanup function to remove listeners & disconnect
    return () => {
      console.log("🧹 Cleaning up socket listeners...");
      newSocket.off("updateOptionCalls", handleUpdateCalls);
      newSocket.off("updateOptionPuts", handleUpdatePuts);
      newSocket.off("updateData", handleUpdateData);
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{ socket, isConnected, dataStock, dataCall, dataPut }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
