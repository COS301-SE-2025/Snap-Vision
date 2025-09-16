import { useCallback } from 'react';

interface WebViewMessage {
  type: string;
  [key: string]: any;
}

interface UseWebViewMessagingProps {
  isPathMode: boolean;
  onCreateRoom: (point: { x: number; y: number }) => void;
  onEditRoom: (roomId: string) => void;
  onRoomsSelected: (selectedRooms: string[]) => void;
  onWaypointAdded: (currentPath: { x: number; y: number }[]) => void;
  onWaypointRemoved: (currentPath: { x: number; y: number }[]) => void;
  onSelectPath: (pathId: string) => void;
}

export const useWebViewMessaging = ({
  isPathMode,
  onCreateRoom,
  onEditRoom,
  onRoomsSelected,
  onWaypointAdded,
  onWaypointRemoved,
  onSelectPath,
}: UseWebViewMessagingProps) => {
  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const data: WebViewMessage = JSON.parse(event.nativeEvent.data);

        switch (data.type) {
          case 'add_marker':
            if (isPathMode && data.selectedRooms?.length === 2) {
              // Add waypoint in path mode (handled in WebView)
              return;
            } else {
              // Regular room marker creation
              onCreateRoom({ x: data.x, y: data.y });
            }
            break;

          case 'edit_marker':
            if (isPathMode) {
              // Room selection for path creation (handled in WebView)
              return;
            } else {
              // Regular room editing
              onEditRoom(data.id);
            }
            break;

          case 'rooms_selected':
            onRoomsSelected(data.selectedRooms);
            break;

          case 'waypoint_added':
            onWaypointAdded(data.currentPath);
            break;

          case 'waypoint_removed':
            onWaypointRemoved(data.currentPath);
            break;

          case 'select_path':
            onSelectPath(data.pathId);
            break;

        default:
          //consolewarn('Unknown WebView message type:', data.type);
      }
    } catch (e) {
      //consoleerror('Error parsing WebView message:', e);
    }
  }, [isPathMode, onCreateRoom, onEditRoom, onRoomsSelected, onWaypointAdded, onWaypointRemoved, onSelectPath]);

  return {
    handleMessage,
  };
};
