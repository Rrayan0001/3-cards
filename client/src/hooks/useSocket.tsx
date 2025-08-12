import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Use deployed backend URL in production, localhost in development
    const serverUrl = process.env.NODE_ENV === 'production' 
      ? 'https://three-cards.onrender.com' // Your actual Render backend URL
      : (process.env.REACT_APP_SERVER_URL || 'http://localhost:5000');
    
    console.log('Connecting to Socket.IO server:', serverUrl);
    
    const newSocket = io(serverUrl);
    newSocket.on('connect', () => {
      console.log('Connected to server!');
      setConnected(true);
    });
    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });
    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });
    setSocket(newSocket);
    return () => {
      newSocket.close();
    };
  }, []);

  return <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>;
};


