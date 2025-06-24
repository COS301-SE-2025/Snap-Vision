import React, { createContext, useState, useContext } from 'react';

type DeepLinkCoords = { lat?: string; lng?: string } | null;

const DeepLinkContext = createContext<{
  coords: DeepLinkCoords;
  setCoords: (coords: DeepLinkCoords) => void;
}>({
  coords: null,
  setCoords: () => {},
});

export const DeepLinkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [coords, setCoords] = useState<DeepLinkCoords>(null);
  return (
    <DeepLinkContext.Provider value={{ coords, setCoords }}>
      {children}
    </DeepLinkContext.Provider>
  );
};

export const useDeepLink = () => useContext(DeepLinkContext);