declare module 'react-native-compass-heading' {
  export interface CompassData {
    heading: number;
    accuracy: number;
  }

  export default class CompassHeading {
    static start(degreeUpdateRate: number, callback: (data: CompassData) => void): void;

    static stop(): void;
  }
}
