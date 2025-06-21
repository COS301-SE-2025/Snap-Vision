// src/components/organisms/BadgeUnlockNotifier.tsx
import React, { useEffect, useState } from 'react';
import BadgePopup from '../molecules/BadgePopup';
import { useBadges } from '../../context/BadgeContext';
import { BadgeId } from '../../types/badges';

export default function BadgeUnlockNotifier() {
  const { state, clearJustUnlocked } = useBadges();
  const [currentBadge, setCurrentBadge] = useState<BadgeId | null>(null);
  const [queue, setQueue] = useState<BadgeId[]>([]);

  // Queue new badges when justUnlocked changes
  useEffect(() => {
    if (state.justUnlocked.length > 0) {
      setQueue(prevQueue => [...prevQueue, ...state.justUnlocked]);
      clearJustUnlocked();
    }
  }, [state.justUnlocked]);
