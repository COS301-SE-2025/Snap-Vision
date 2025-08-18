import { useEffect, useRef } from 'react';
import { Image } from 'react-native';

type FloorplanCache = {
  [key: string]: boolean;
};

// Singleton to maintain the cache across component instances
const globalFloorplanCache: FloorplanCache = {};

/**
 * Hook to preload multiple floorplan images
 * @param floorplanUrls Array of floorplan URLs to preload
 * @param onProgress Optional callback for loading progress updates
 */
export function useFloorplanPreloader(
  floorplanUrls: string[], 
  onProgress?: (loaded: number, total: number) => void
) {
  const cacheRef = useRef<FloorplanCache>(globalFloorplanCache);
  
  useEffect(() => {
    // Filter out URLs that are already cached
    const urlsToLoad = floorplanUrls.filter(url => !cacheRef.current[url]);
    
    if (urlsToLoad.length === 0) {
      // All already loaded
      onProgress?.(floorplanUrls.length, floorplanUrls.length);
      return;
    }
    
    let loadedCount = floorplanUrls.length - urlsToLoad.length;
    onProgress?.(loadedCount, floorplanUrls.length);
    
    // Load each image using React Native's Image.prefetch
    const prefetchPromises = urlsToLoad.map(url => {
      return Image.prefetch(url)
        .then(() => {
          // Mark as cached on success
          cacheRef.current[url] = true;
          loadedCount++;
          onProgress?.(loadedCount, floorplanUrls.length);
          return true;
        })
        .catch(error => {
          console.error(`Failed to preload floorplan: ${url}`, error);
          loadedCount++;
          onProgress?.(loadedCount, floorplanUrls.length);
          return false;
        });
    });
    
    // Wait for all prefetch operations to complete
    Promise.all(prefetchPromises).then(() => {
      console.log('All available floorplans preloaded');
    });
    
  }, [floorplanUrls, onProgress]);
  
  return {
    isPreloaded: (url: string) => !!cacheRef.current[url]
  };
}

/**
 * Preload a set of floorplan images in the background
 * @param urls Array of floorplan URLs to preload
 * @returns Promise that resolves when all floorplans are loaded
 */
export function preloadFloorplans(urls: string[]): Promise<void> {
  return new Promise((resolve) => {
    // Skip if empty
    if (urls.length === 0) {
      resolve();
      return;
    }
    
    const urlsToLoad = urls.filter(url => !globalFloorplanCache[url]);
    if (urlsToLoad.length === 0) {
      // All images already cached
      resolve();
      return;
    }
    
    // Use Promise.all with Image.prefetch
    Promise.all(
      urlsToLoad.map(url => 
        Image.prefetch(url)
          .then(() => {
            globalFloorplanCache[url] = true;
            return true;
          })
          .catch(error => {
            console.error(`Failed to preload floorplan: ${url}`, error);
            return false;
          })
      )
    ).then(() => resolve());
  });
}

/**
 * Check if a floorplan URL is already preloaded
 */
export function isFloorplanPreloaded(url: string): boolean {
  return !!globalFloorplanCache[url];
}
