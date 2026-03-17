'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getViewedScenes,
  markSceneViewed,
} from '@/lib/utils/scene-progress';

interface UseSceneProgressOptions {
  classroomId: string | null;
  totalScenes: number;
}

interface UseSceneProgressResult {
  isViewed: (sceneId: string) => boolean;
  markViewed: (sceneId: string) => void;
  viewedCount: number;
  totalCount: number;
  progressPercent: number;
}

export function useSceneProgress({
  classroomId,
  totalScenes,
}: UseSceneProgressOptions): UseSceneProgressResult {
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const viewedIdsRef = useRef(viewedIds);

  // Keep ref in sync with state so markViewed always reads the latest set
  // without needing viewedIds in its dependency array
  useEffect(() => {
    viewedIdsRef.current = viewedIds;
  }, [viewedIds]);

  // Load from localStorage on mount / classroomId change
  useEffect(() => {
    if (!classroomId) return;
    setViewedIds(getViewedScenes(classroomId));
  }, [classroomId]);

  const markViewed = useCallback(
    (sceneId: string) => {
      if (!classroomId) return;
      const next = new Set(viewedIdsRef.current);
      next.add(sceneId);
      markSceneViewed(classroomId, sceneId, next);
      setViewedIds(next);
    },
    [classroomId]
  );

  const isViewed = useCallback(
    (sceneId: string) => viewedIds.has(sceneId),
    [viewedIds]
  );

  const viewedCount = viewedIds.size;
  const progressPercent =
    totalScenes > 0 ? Math.round((viewedCount / totalScenes) * 100) : 0;

  return {
    isViewed,
    markViewed,
    viewedCount,
    totalCount: totalScenes,
    progressPercent,
  };
}
