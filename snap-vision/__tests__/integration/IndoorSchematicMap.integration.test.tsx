/**
 * @file IndoorSchematicMap.integration.test.tsx
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import IndoorSchematicMap from '../../src/components/organisms/IndoorSchematicMap';

// ---- Mock: Navigation Theme (switchable)
const mockUseTheme = jest.fn(() => ({ dark: false }));
jest.mock('@react-navigation/native', () => ({
  useTheme: () => mockUseTheme(),
}));

// ---- Mock: Floorplan preloader utils (progress fires once per test)
jest.mock('../../src/utils/FloorplanManager', () => {
  let progressFired = false;

  const api = {
    preloadFloorplans: jest.fn(),
    isFloorplanPreloaded: jest.fn((url?: string) => Boolean(url && url.includes('preloaded'))),
    useFloorplanPreloader: jest.fn(
      (urls: string[], onProgress?: (l: number, t: number) => void) => {
        if (!progressFired && onProgress) {
          progressFired = true;
          const total = urls.length || 1;
          setTimeout(() => {
            onProgress(0, total || 1);
            onProgress(Math.ceil(total / 2), total || 1);
            onProgress(total || 1, total || 1);
          }, 0);
        }
        return {
          isPreloaded: (url?: string) => Boolean(url && url.includes('preloaded')),
        };
      },
    ),
  };
  return api;
});

// ---- Mock: WebView (expose message/error helpers)
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { useEffect, useImperativeHandle, forwardRef } = React;
  const { View } = require('react-native');

  const injectedScripts: string[] = [];
  let lastOnMessage: ((e: any) => void) | null = null;
  let lastOnError: ((e: any) => void) | null = null;

  const MockWebView = forwardRef((props: any, ref) => {
    useEffect(() => {
      props.onLoad?.({ nativeEvent: {} });
      props.onLoadEnd?.({ nativeEvent: {} });
      lastOnMessage = props.onMessage || null;
      lastOnError = props.onError || null;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
      injectJavaScript: (code: string) => {
        injectedScripts.push(code);
        return true;
      },
    }));

    return <View testID="mock-webview" />;
  });

  MockWebView.displayName = 'MockWebView';

  const __getInjected = () => injectedScripts;
  const __clearInjected = () => injectedScripts.splice(0, injectedScripts.length);
  const __fireMessage = (data: any) => {
    lastOnMessage?.({ nativeEvent: { data: JSON.stringify(data) } });
  };
  const __fireError = (err: any = { message: 'mock webview error' }) => {
    lastOnError?.({ nativeEvent: err });
  };

  return {
    __esModule: true,
    default: MockWebView,
    __getInjected,
    __clearInjected,
    __fireMessage,
    __fireError,
  };
});

const { __getInjected, __clearInjected, __fireMessage } = require('react-native-webview');

describe('IndoorSchematicMap (Integration)', () => {
  const rooms = [
    { id: 's', name: 'Start', coordinates: { x: 0.12, y: 0.22 } },
    { id: 'e', name: 'End', coordinates: { x: 0.82, y: 0.12 }, type: 'entrance' },
  ];

  const themeColors = {
    background: '#ffffff',
    text: '#000000',
    primary: '#007AFF',
    secondary: '#FF4081',
    success: '#4CAF50',
    warning: '#FFB300',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    __clearInjected();
    jest.useFakeTimers();
    mockUseTheme.mockReturnValue({ dark: false });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('initializes map and transitions from preloading → loaded (with progress updates)', async () => {
    render(
      <IndoorSchematicMap
        rooms={rooms}
        startId="s"
        endId="e"
        onSelectRoom={jest.fn()}
        themeColors={themeColors}
        floorplanUrl="https://example.com/floor-a.png"
        additionalFloorplans={['https://example.com/floor-b.png']}
      />,
    );

    expect(screen.getByText(/Preloading floorplans/i)).toBeTruthy();

    await act(async () => {
      jest.runAllTimers();
    });

    act(() => {
      __fireMessage({ type: 'floorplan_loaded', success: true });
    });

    expect(screen.queryByText(/Preloading floorplans/i)).toBeNull();
  });

  it('switches floors without reloading WebView and injects mountFloorplan()', async () => {
    const { rerender } = render(
      <IndoorSchematicMap
        rooms={rooms}
        startId="s"
        endId="e"
        onSelectRoom={jest.fn()}
        themeColors={themeColors}
        floorplanUrl="https://example.com/floor-a.png"
        additionalFloorplans={[]}
      />,
    );

    await act(async () => {
      jest.runAllTimers();
    });

    __clearInjected();

    rerender(
      <IndoorSchematicMap
        rooms={rooms}
        startId="s"
        endId="e"
        onSelectRoom={jest.fn()}
        themeColors={themeColors}
        floorplanUrl="https://example.com/floor-b.png"
        additionalFloorplans={[]}
      />,
    );

    expect(__getInjected().join('\n')).toMatch(
      /window\.mountFloorplan\('https:\/\/example\.com\/floor-b\.png'\)/,
    );
  });

  // NOTE: this test was the one you fixed; keeping the precise timer driving
  it('retry mechanism attempts re-init when floorplan fails to load', async () => {
    render(
      <IndoorSchematicMap
        rooms={rooms}
        startId="s"
        endId="e"
        onSelectRoom={jest.fn()}
        themeColors={themeColors}
        floorplanUrl="https://example.com/floor-fails.png"
        additionalFloorplans={[]}
      />,
    );

    // Flush preloader 0ms and the component’s 300ms init delay only
    await act(async () => {
      jest.advanceTimersByTime(0);
      jest.advanceTimersByTime(300);
    });

    // Initial initMap will have been injected; clear to capture only retries
    __clearInjected();

    // Retry #1
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(__getInjected().join('\n')).toMatch(/window\.initMap\(/);

    // Retry #2
    __clearInjected();
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(__getInjected().join('\n')).toMatch(/window\.initMap\(/);

    // Retry #3 (max)
    __clearInjected();
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(__getInjected().join('\n')).toMatch(/window\.initMap\(/);

    // No more
    __clearInjected();
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(__getInjected().length).toBe(0);
  });

  it('sends room_selected through the message bridge to onSelectRoom', async () => {
    const onSelectRoom = jest.fn();
    render(
      <IndoorSchematicMap
        rooms={rooms}
        startId="s"
        endId="e"
        onSelectRoom={onSelectRoom}
        themeColors={themeColors}
        floorplanUrl="https://example.com/floor-a.png"
      />,
    );

    await act(async () => {
      jest.runAllTimers();
    });

    act(() => {
      __fireMessage({ type: 'room_selected', id: 'e' });
    });

    expect(onSelectRoom).toHaveBeenCalledWith('e');
  });

  it('applies dark mode theme (different setThemeColors payload)', async () => {
    mockUseTheme.mockReturnValueOnce({ dark: true });

    render(
      <IndoorSchematicMap
        rooms={rooms}
        startId="s"
        endId="e"
        onSelectRoom={jest.fn()}
        themeColors={themeColors}
        floorplanUrl="https://example.com/floor-a.png"
      />,
    );

    await act(async () => {
      jest.runAllTimers();
    });

    expect(__getInjected().join('\n')).toMatch(
      /window\.setThemeColors\(\{[^}]*"background":"#121212"/,
    );
  });

  it('does not show loading overlay when switching to an already preloaded floor', async () => {
    const { rerender } = render(
      <IndoorSchematicMap
        rooms={rooms}
        startId="s"
        endId="e"
        onSelectRoom={jest.fn()}
        themeColors={themeColors}
        floorplanUrl="https://example.com/floor-a.png"
        additionalFloorplans={['https://example.com/floor-preloaded.png']}
      />,
    );

    await act(async () => {
      jest.runAllTimers();
    });

    // mark first floor as loaded
    act(() => {
      __fireMessage({ type: 'floorplan_loaded', success: true });
    });

    __clearInjected();
    rerender(
      <IndoorSchematicMap
        rooms={rooms}
        startId="s"
        endId="e"
        onSelectRoom={jest.fn()}
        themeColors={themeColors}
        floorplanUrl="https://example.com/floor-preloaded.png"
        additionalFloorplans={[]}
      />,
    );

    expect(screen.queryByText(/Preloading floorplans/i)).toBeNull();
    expect(__getInjected().join('\n')).toMatch(
      /window\.mountFloorplan\('https:\/\/example\.com\/floor-preloaded\.png'\)/,
    );
  });

  // ---- NEW: unmount cleanup cancels pending retries (covers unmount effect)
  it('cancels pending retries on unmount (no initMap after unmount)', async () => {
    const { unmount } = render(
      <IndoorSchematicMap
        rooms={rooms}
        startId="s"
        endId="e"
        onSelectRoom={jest.fn()}
        themeColors={themeColors}
        floorplanUrl="https://example.com/floor-fails.png"
        additionalFloorplans={[]}
      />,
    );

    // Let initial 300ms init schedule; then clear injections and unmount
    await act(async () => {
      jest.advanceTimersByTime(0);
      jest.advanceTimersByTime(300);
    });
    __clearInjected();

    // Unmount before any 2s retry can fire
    unmount();

    // Advance time beyond several retry windows; nothing should be injected
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(__getInjected().length).toBe(0);
  });
});
