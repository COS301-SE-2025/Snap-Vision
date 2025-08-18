/**
 * @file IndoorSchematicMap.unit.test.tsx
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import IndoorSchematicMap from '../src/components/organisms/IndoorSchematicMap';

// ---- Mock: Navigation Theme
jest.mock('@react-navigation/native', () => ({
  useTheme: jest.fn(() => ({ dark: false })),
}));

// ---- Mock: Floorplan preloader utils (progress fires once to avoid re-render loops)
jest.mock('../src/utils/FloorplanManager', () => {
  let progressFired = false;

  const api = {
    preloadFloorplans: jest.fn(),
    isFloorplanPreloaded: jest.fn(() => false),
    useFloorplanPreloader: jest.fn((urls: string[], onProgress?: (l: number, t: number) => void) => {
      if (!progressFired && onProgress) {
        progressFired = true;
        const total = Math.max(urls?.length || 1, 2);
        setTimeout(() => {
          onProgress(1, total);
          onProgress(total, total); // 100%
        }, 0);
      }
      return {
        isPreloaded: (url?: string) => Boolean(url) && url.includes('preloaded'),
      };
    }),
  };
  return api;
});

// ---- Mock: WebView (records injected JS, exposes __fireMessage and __fireError)
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

  const __getInjected = () => injectedScripts;
  const __clearInjected = () => injectedScripts.splice(0, injectedScripts.length);
  const __fireMessage = (data: any) => {
    lastOnMessage?.({ nativeEvent: { data: JSON.stringify(data) } });
  };
  const __fireRawMessage = (raw: string) => {
    lastOnMessage?.({ nativeEvent: { data: raw } });
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
    __fireRawMessage,
    __fireError,
  };
});

const { __getInjected, __clearInjected, __fireMessage, __fireRawMessage, __fireError } =
  require('react-native-webview');

describe('IndoorSchematicMap (Unit)', () => {
  const baseProps = {
    rooms: [
      { id: 'r1', name: 'Room 1', coordinates: { x: 0.1, y: 0.2 } },
      { id: 'r2', name: 'Room 2', coordinates: { x: 0.3, y: 0.4 }, isEntrance: true },
    ],
    startId: 'r1',
    endId: 'r2',
    routePolyline: [{ x: 0.1, y: 0.2 }, { x: 0.4, y: 0.5 }],
    completedPolyline: [{ x: 0.1, y: 0.2 }],
    currentPos: { x: 0.2, y: 0.25 },
    onSelectRoom: jest.fn(),
    themeColors: {
      background: '#ffffff',
      text: '#000000',
      primary: '#007AFF',
      secondary: '#FF4081',
      success: '#4CAF50',
      warning: '#FFB300',
    },
    floorplanUrl: 'https://example.com/floor-a.png',
    additionalFloorplans: ['https://example.com/floor-b.png'],
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    __clearInjected();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders the WebView and initial loading overlay', async () => {
    render(<IndoorSchematicMap {...baseProps} />);

    const webview = await screen.findByTestId('mock-webview');
    expect(webview).toBeTruthy();
    expect(screen.getByText(/Preloading floorplans/i)).toBeTruthy();

    await act(async () => {
      jest.runAllTimers();
    });
  });

  it('hides loading overlay after floorplan reports loaded', async () => {
    render(<IndoorSchematicMap {...baseProps} />);

    expect(screen.getByText(/Preloading floorplans/i)).toBeTruthy();

    await act(async () => {
      jest.runAllTimers();
    });

    act(() => {
      __fireMessage({ type: 'floorplan_loaded', success: true });
    });

    expect(screen.queryByText(/Preloading floorplans/i)).toBeNull();
  });

  it('prop changes trigger incremental JS updates (start/end/route/completed/currentPos)', async () => {
    const { rerender } = render(<IndoorSchematicMap {...baseProps} />);

    await act(async () => {
      jest.runAllTimers();
    });

    __clearInjected();

    rerender(<IndoorSchematicMap {...baseProps} startId="r2" endId="r1" />);
    expect(__getInjected().join('\n')).toMatch(/window\.setStartEnd\("r2", "r1"\)/);

    __clearInjected();
    rerender(<IndoorSchematicMap {...baseProps} routePolyline={[{ x: 0.5, y: 0.5 }]} />);
    expect(__getInjected().join('\n')).toMatch(/window\.setRoute\(\[\{"x":0\.5,"y":0\.5\}\]\)/);

    __clearInjected();
    rerender(<IndoorSchematicMap {...baseProps} completedPolyline={[{ x: 0.9, y: 0.1 }]} />);
    expect(__getInjected().join('\n')).toMatch(/window\.setCompleted\(\[\{"x":0\.9,"y":0\.1\}\]\)/);

    __clearInjected();
    rerender(<IndoorSchematicMap {...baseProps} currentPos={{ x: 0.77, y: 0.33 }} />);
    expect(__getInjected().join('\n')).toMatch(/window\.updateCurrentPos\(\{"x":0\.77,"y":0\.33\}\)/);
  });

  it('theme updates call setThemeColors without reload', async () => {
    const { rerender } = render(<IndoorSchematicMap {...baseProps} />);

    await act(async () => {
      jest.runAllTimers();
    });

    __clearInjected();
    rerender(
      <IndoorSchematicMap
        {...baseProps}
        themeColors={{ ...baseProps.themeColors, primary: '#00FF00' }}
      />
    );

    expect(__getInjected().join('\n')).toMatch(/window\.setThemeColors\(\{.*"primary":"#00FF00".*\}\)/);
  });

  it('handles room_selected messages by calling onSelectRoom', async () => {
    const onSelectRoom = jest.fn();
    render(<IndoorSchematicMap {...baseProps} onSelectRoom={onSelectRoom} />);

    await act(async () => {
      jest.runAllTimers();
    });

    act(() => {
      __fireMessage({ type: 'room_selected', id: 'r2' });
    });

    expect(onSelectRoom).toHaveBeenCalledWith('r2');
  });

  // ---- NEW: covers handleMessage catch branch (invalid JSON)
  it('handles invalid JSON from WebView message without crashing', async () => {
    render(<IndoorSchematicMap {...baseProps} />);
    await act(async () => {
      jest.runAllTimers();
    });

    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    act(() => {
      // send raw unparseable string
      __fireRawMessage('{not-json');
    });
    expect(spy).toHaveBeenCalled(); // parsing error logged
    spy.mockRestore();
  });

  // ---- NEW: covers map_init_error branch
  it('logs map_init_error messages gracefully', async () => {
    render(<IndoorSchematicMap {...baseProps} />);
    await act(async () => {
      jest.runAllTimers();
    });

    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    act(() => {
      __fireMessage({ type: 'map_init_error', error: 'boom' });
    });
    expect(spy).toHaveBeenCalledWith('Map initialization error:', 'boom');
    spy.mockRestore();
  });

  // ---- NEW: covers onError handler passed to WebView
  it('handles WebView onError', async () => {
    render(<IndoorSchematicMap {...baseProps} />);

    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    act(() => {
      __fireError({ message: 'network fail' });
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });})
