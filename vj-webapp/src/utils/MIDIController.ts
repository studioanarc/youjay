/**
 * MIDIController - Web MIDI API integration for MIDI controller support
 * Handles MIDI device connections, message parsing, and event handling
 */

export interface MIDIDevice {
  id: string;
  name: string;
  manufacturer: string;
  state: 'connected' | 'disconnected';
  type: 'input' | 'output';
}

export interface MIDIMessage {
  type: 'noteon' | 'noteoff' | 'cc' | 'programchange' | 'pitchbend' | 'aftertouch' | 'unknown';
  channel: number;
  note?: number;
  velocity?: number;
  cc?: number;
  value: number;
  rawData: Uint8Array;
  timestamp: number;
  deviceId: string;
}

export type MIDIMessageCallback = (message: MIDIMessage) => void;
export type MIDIDeviceCallback = (device: MIDIDevice) => void;

export class MIDIController {
  private midiAccess: MIDIAccess | null = null;
  private inputs: Map<string, MIDIInput> = new Map();
  private outputs: Map<string, MIDIOutput> = new Map();
  private messageCallbacks: Set<MIDIMessageCallback> = new Set();
  private deviceConnectedCallbacks: Set<MIDIDeviceCallback> = new Set();
  private deviceDisconnectedCallbacks: Set<MIDIDeviceCallback> = new Set();
  private isInitialized = false;

  /**
   * Initialize MIDI access
   */
  async initialize(): Promise<void> {
    if (!navigator.requestMIDIAccess) {
      throw new Error('Web MIDI API is not supported in this browser');
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });

      // Listen for device connection changes
      this.midiAccess.onstatechange = (event) => {
        this.handleStateChange(event);
      };

      // Initialize existing inputs
      this.midiAccess.inputs.forEach((input) => {
        this.connectInput(input);
      });

      // Initialize existing outputs
      this.midiAccess.outputs.forEach((output) => {
        this.connectOutput(output);
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize MIDI:', error);
      throw error;
    }
  }

  /**
   * Connect to a MIDI input device
   */
  private connectInput(input: MIDIInput): void {
    this.inputs.set(input.id, input);

    input.onmidimessage = (event) => {
      const message = this.parseMIDIMessage(event, input.id);
      this.notifyMessageCallbacks(message);
    };

    // Notify device connected
    const device: MIDIDevice = {
      id: input.id,
      name: input.name || 'Unknown Device',
      manufacturer: input.manufacturer || 'Unknown',
      state: input.state as 'connected' | 'disconnected',
      type: 'input',
    };

    this.deviceConnectedCallbacks.forEach(callback => callback(device));
  }

  /**
   * Connect to a MIDI output device
   */
  private connectOutput(output: MIDIOutput): void {
    this.outputs.set(output.id, output);

    const device: MIDIDevice = {
      id: output.id,
      name: output.name || 'Unknown Device',
      manufacturer: output.manufacturer || 'Unknown',
      state: output.state as 'connected' | 'disconnected',
      type: 'output',
    };

    this.deviceConnectedCallbacks.forEach(callback => callback(device));
  }

  /**
   * Handle MIDI device state changes (connect/disconnect)
   */
  private handleStateChange(event: MIDIConnectionEvent): void {
    const port = event.port;
    if (!port) return;

    const device: MIDIDevice = {
      id: port.id,
      name: port.name || 'Unknown Device',
      manufacturer: port.manufacturer || 'Unknown',
      state: port.state as 'connected' | 'disconnected',
      type: port.type === 'input' ? 'input' : 'output',
    };

    if (port.state === 'connected') {
      if (port.type === 'input') {
        this.connectInput(port as MIDIInput);
      } else {
        this.connectOutput(port as MIDIOutput);
      }
    } else if (port.state === 'disconnected') {
      if (port.type === 'input') {
        this.inputs.delete(port.id);
      } else {
        this.outputs.delete(port.id);
      }

      this.deviceDisconnectedCallbacks.forEach(callback => callback(device));
    }
  }

  /**
   * Parse MIDI message from event
   */
  private parseMIDIMessage(event: MIDIMessageEvent, deviceId: string): MIDIMessage {
    const data = event.data;
    if (!data) {
      return {
        type: 'unknown',
        channel: 0,
        value: 0,
        rawData: new Uint8Array(),
        timestamp: event.timeStamp,
        deviceId,
      };
    }

    const status = data[0];
    const messageType = status & 0xf0;
    const channel = (status & 0x0f) + 1; // MIDI channels are 1-16

    let type: MIDIMessage['type'] = 'unknown';
    let note: number | undefined;
    let velocity: number | undefined;
    let cc: number | undefined;
    let value = 0;

    switch (messageType) {
      case 0x90: // Note On
        type = data[2] > 0 ? 'noteon' : 'noteoff'; // velocity 0 = note off
        note = data[1];
        velocity = data[2];
        value = velocity;
        break;

      case 0x80: // Note Off
        type = 'noteoff';
        note = data[1];
        velocity = data[2];
        value = velocity;
        break;

      case 0xb0: // Control Change
        type = 'cc';
        cc = data[1];
        value = data[2];
        break;

      case 0xc0: // Program Change
        type = 'programchange';
        value = data[1];
        break;

      case 0xe0: // Pitch Bend
        type = 'pitchbend';
        value = (data[2] << 7) | data[1]; // 14-bit value
        break;

      case 0xd0: // Aftertouch
        type = 'aftertouch';
        value = data[1];
        break;
    }

    return {
      type,
      channel,
      note,
      velocity,
      cc,
      value,
      rawData: data,
      timestamp: event.timeStamp,
      deviceId,
    };
  }

  /**
   * Register callback for MIDI messages
   */
  onMessage(callback: MIDIMessageCallback): () => void {
    this.messageCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.messageCallbacks.delete(callback);
    };
  }

  /**
   * Register callback for device connections
   */
  onDeviceConnected(callback: MIDIDeviceCallback): () => void {
    this.deviceConnectedCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.deviceConnectedCallbacks.delete(callback);
    };
  }

  /**
   * Register callback for device disconnections
   */
  onDeviceDisconnected(callback: MIDIDeviceCallback): () => void {
    this.deviceDisconnectedCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.deviceDisconnectedCallbacks.delete(callback);
    };
  }

  /**
   * Notify all message callbacks
   */
  private notifyMessageCallbacks(message: MIDIMessage): void {
    this.messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in MIDI message callback:', error);
      }
    });
  }

  /**
   * Get all connected input devices
   */
  getInputDevices(): MIDIDevice[] {
    const devices: MIDIDevice[] = [];

    this.inputs.forEach((input) => {
      devices.push({
        id: input.id,
        name: input.name || 'Unknown Device',
        manufacturer: input.manufacturer || 'Unknown',
        state: input.state as 'connected' | 'disconnected',
        type: 'input',
      });
    });

    return devices;
  }

  /**
   * Get all connected output devices
   */
  getOutputDevices(): MIDIDevice[] {
    const devices: MIDIDevice[] = [];

    this.outputs.forEach((output) => {
      devices.push({
        id: output.id,
        name: output.name || 'Unknown Device',
        manufacturer: output.manufacturer || 'Unknown',
        state: output.state as 'connected' | 'disconnected',
        type: 'output',
      });
    });

    return devices;
  }

  /**
   * Get all connected devices (inputs and outputs)
   */
  getAllDevices(): MIDIDevice[] {
    return [...this.getInputDevices(), ...this.getOutputDevices()];
  }

  /**
   * Send MIDI message to output device
   */
  sendMessage(deviceId: string, data: number[]): void {
    const output = this.outputs.get(deviceId);
    if (output) {
      output.send(data);
    }
  }

  /**
   * Send Note On message
   */
  sendNoteOn(deviceId: string, channel: number, note: number, velocity: number): void {
    const status = 0x90 | ((channel - 1) & 0x0f);
    this.sendMessage(deviceId, [status, note & 0x7f, velocity & 0x7f]);
  }

  /**
   * Send Note Off message
   */
  sendNoteOff(deviceId: string, channel: number, note: number, velocity: number = 0): void {
    const status = 0x80 | ((channel - 1) & 0x0f);
    this.sendMessage(deviceId, [status, note & 0x7f, velocity & 0x7f]);
  }

  /**
   * Send Control Change message
   */
  sendCC(deviceId: string, channel: number, cc: number, value: number): void {
    const status = 0xb0 | ((channel - 1) & 0x0f);
    this.sendMessage(deviceId, [status, cc & 0x7f, value & 0x7f]);
  }

  /**
   * Check if MIDI is supported
   */
  static isSupported(): boolean {
    return 'requestMIDIAccess' in navigator;
  }

  /**
   * Check if initialized
   */
  get ready(): boolean {
    return this.isInitialized;
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    // Clear all callbacks
    this.messageCallbacks.clear();
    this.deviceConnectedCallbacks.clear();
    this.deviceDisconnectedCallbacks.clear();

    // Close all inputs
    this.inputs.forEach((input) => {
      input.onmidimessage = null;
    });
    this.inputs.clear();

    // Clear outputs
    this.outputs.clear();

    this.midiAccess = null;
    this.isInitialized = false;
  }
}
