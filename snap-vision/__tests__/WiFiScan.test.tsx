import { scanForWiFiNetworks } from '../src/services/scanService';
import WifiManager from 'react-native-wifi-reborn';

jest.mock('react-native-wifi-reborn', () => ({
  reScanAndLoadWifiList: jest.fn(),
}));

describe('scanForWiFiNetworks (unit)', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('maps Wi-Fi results to the expected shape (happy path)', async () => {
    (WifiManager.reScanAndLoadWifiList as jest.Mock).mockResolvedValue([
      { SSID: 'Net-1', BSSID: 'aa:bb', level: -42, frequency: 2412, capabilities: '[WPA2]' },
      { SSID: 'Net-2', BSSID: 'cc:dd', level: -65, frequency: 5200, noise: -90 },
    ]);

    const out = await scanForWiFiNetworks();

    expect(out).toEqual([
      { SSID: 'Net-1', BSSID: 'aa:bb', level: -42, frequency: 2412 },
      { SSID: 'Net-2', BSSID: 'cc:dd', level: -65, frequency: 5200 },
    ]);

    expect(logSpy).toHaveBeenCalledWith('WiFi scan results:', [
      { SSID: 'Net-1', BSSID: 'aa:bb', level: -42, frequency: 2412, capabilities: '[WPA2]' },
      { SSID: 'Net-2', BSSID: 'cc:dd', level: -65, frequency: 5200, noise: -90 },
    ]);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('returns [] and warns when result is not an array', async () => {
    (WifiManager.reScanAndLoadWifiList as jest.Mock).mockResolvedValue({ hello: 'world' });

    const out = await scanForWiFiNetworks();

    expect(out).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith('WiFi scan returned non-array:', { hello: 'world' });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('returns [] and logs error when scan rejects', async () => {
    const err = new Error('scan failed');
    (WifiManager.reScanAndLoadWifiList as jest.Mock).mockRejectedValue(err);

    const out = await scanForWiFiNetworks();

    expect(out).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith('Wi-Fi scan failed:', err);
  });

  it('handles empty array (returns empty list, logs results)', async () => {
    (WifiManager.reScanAndLoadWifiList as jest.Mock).mockResolvedValue([]);

    const out = await scanForWiFiNetworks();

    expect(out).toEqual([]);
    expect(logSpy).toHaveBeenCalledWith('WiFi scan results:', []);
  });
});
