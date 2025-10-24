import React, { createContext, useCallback, useEffect, useRef, useState, ReactNode } from 'react';
import { ToastLevel, ToastLevels } from './Toast';

const TOAST_DURATION_MS = 6000;
const TOAST_QUEUE_LIMIT = 5;

export interface ToastMessage {
  message: string;
  level?: ToastLevel;
}

export interface ToastContextValue {
  enqueueToast: (message: string, level?: ToastLevel) => void;
  clearCurrentToast: () => void;
  currentToast: ToastMessage | undefined;
  toastCount: number;
}

const ToastContext = createContext<ToastContextValue>({
  enqueueToast: () => {},
  clearCurrentToast: () => {},
  currentToast: undefined,
  toastCount: 0,
});

interface ToastProviderProps {
  children: ReactNode;
}

const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [queue, setQueue] = useState<ToastMessage[]>([]);

  const timerRef = useRef<NodeJS.Timeout>();

  const enqueueToast = (message: string, level: ToastLevel = ToastLevels.INFO) => {
    setQueue((prevQueue) => {
      const newQueue = [...prevQueue];
      while (newQueue.length >= TOAST_QUEUE_LIMIT) {
        newQueue.splice(0, 1);
      }
      return [...newQueue, { message, level }];
    });
  };

  const clearCurrentToast = useCallback(() => {
    setQueue((prevQueue) => prevQueue.slice(1));
  }, []);

  useEffect(() => {
    if (queue.length > 0) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => clearCurrentToast(), TOAST_DURATION_MS);
    }

    return () => clearTimeout(timerRef.current);
  }, [queue, clearCurrentToast]);

  return (
    <ToastContext.Provider
      value={{
        enqueueToast,
        clearCurrentToast,
        currentToast: queue[0],
        toastCount: queue.length
      }}
    >
      {children}
    </ToastContext.Provider>
  );
};

export { ToastContext, ToastProvider };
