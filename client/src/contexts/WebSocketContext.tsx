import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { type Device, type SystemMetrics, type SystemInfo } from '@shared/schema';

interface WebSocketContextType {
  connected: boolean;
  mqttConnected: boolean;
  mqttBroker: string | null;
  systemMetrics: SystemMetrics | null;
  systemInfo: SystemInfo | null;
  devices: Device[];
  latestReadings: any[];
  sendMessage: (message: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  connected: false,
  mqttConnected: false,
  mqttBroker: null,
  systemMetrics: null,
  systemInfo: null,
  devices: [],
  latestReadings: [],
  sendMessage: () => {},
});

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [mqttBroker, setMqttBroker] = useState<string | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [latestReadings, setLatestReadings] = useState<any[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const initWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Clear any existing reconnection attempt
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      toast({
        title: 'WebSocket Connected',
        description: 'Real-time data connection established',
      });
    };

    ws.onclose = () => {
      setConnected(false);
      
      // Attempt to reconnect after a delay
      reconnectTimeoutRef.current = setTimeout(() => {
        initWebSocket();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to establish real-time connection',
        variant: 'destructive',
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
  }, []);

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'mqtt_status':
        setMqttConnected(message.status === 'connected');
        if (message.broker) {
          setMqttBroker(message.broker);
        }
        break;
      
      case 'system_metrics':
        setSystemMetrics(message.metrics);
        break;
      
      case 'system_info':
        setSystemInfo(message.info);
        break;
      
      case 'devices':
        setDevices(message.devices);
        break;
      
      case 'latest_readings':
        setLatestReadings(message.readings);
        break;
      
      case 'sensor_data':
        // Update the latest readings with new data
        setLatestReadings(prevReadings => {
          const newReading = {
            deviceId: message.deviceId,
            sensorType: message.sensorType,
            value: message.data.value,
            unit: message.data.unit,
            timestamp: message.timestamp
          };
          
          // Remove old reading for the same device and sensor type
          const filteredReadings = prevReadings.filter(
            r => !(r.deviceId === message.deviceId && r.sensorType === message.sensorType)
          );
          
          return [...filteredReadings, newReading];
        });
        break;
      
      default:
        console.log('Unknown message type:', message.type);
    }
  };

  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      toast({
        title: 'Connection Error',
        description: 'Not connected to the server',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    initWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [initWebSocket]);

  return (
    <WebSocketContext.Provider 
      value={{ 
        connected, 
        mqttConnected, 
        mqttBroker, 
        systemMetrics, 
        systemInfo,
        devices,
        latestReadings,
        sendMessage
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};
