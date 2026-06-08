import React, { createContext, useContext, useState, ReactNode } from 'react';

export type QuoteStatus = 'draft' | 'pending' | 'sent';
export type ShirtType = 't-shirt' | 'hoodie' | 'long-sleeve';
export type ShirtSize = 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL';

export interface ShirtDetails {
  color: string;
  type: ShirtType;
  size: ShirtSize;
  dimensions: { 
    width: number; 
    height: number; 
  }; // Defines the physical constraints of the printable area
}

export interface UserSession {
  email: string | null;
  quoteStatus: QuoteStatus;
}

export interface SharedState {
  currentShirt: ShirtDetails;
  canvasObjects: Record<string, any>[]; // Fabric.js serialized JSON objects
  userSession: UserSession;
}

interface DesignContextType {
  state: SharedState;
  setState: React.Dispatch<React.SetStateAction<SharedState>>;
  setCanvasObjects: (objects: any[]) => void;
  setCurrentShirt: (shirt: Partial<ShirtDetails>) => void;
  setQuoteStatus: (status: QuoteStatus) => void;
}

const DesignContext = createContext<DesignContextType | undefined>(undefined);

export const DesignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SharedState>({
    currentShirt: {
      color: '#ffffff',
      type: 't-shirt',
      size: 'L',
      dimensions: { width: 300, height: 400 },
    },
    canvasObjects: [],
    userSession: {
      email: null,
      quoteStatus: 'draft',
    },
  });

  const setCanvasObjects = (objects: any[]) => {
    setState((prev) => ({ ...prev, canvasObjects: objects }));
  };

  const setCurrentShirt = (shirt: Partial<ShirtDetails>) => {
    setState((prev) => ({
      ...prev,
      currentShirt: { ...prev.currentShirt, ...shirt },
    }));
  };

  const setQuoteStatus = (status: QuoteStatus) => {
    setState((prev) => ({
      ...prev,
      userSession: { ...prev.userSession, quoteStatus: status },
    }));
  };

  return (
    <DesignContext.Provider
      value={{
        state,
        setState,
        setCanvasObjects,
        setCurrentShirt,
        setQuoteStatus,
      }}
    >
      {children}
    </DesignContext.Provider>
  );
};

export const useDesign = () => {
  const context = useContext(DesignContext);
  if (context === undefined) {
    throw new Error('useDesign must be used within a DesignProvider');
  }
  return context;
};
