/**
 * useMIDI - React hook for MIDI controller connections
 * Handles device management, message processing, and MIDI learn mode
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { MIDIController, type MIDIDevice, type MIDIMessageCallback } from '../utils/MIDIController';
import { MIDIMappingEngine } from '../utils/midiMapping';
import type { MIDIMapping } from '../types';

export interface UseMIDIOptions {
  autoConnect?: boolean;
  onMessage?: MIDIMessageCallback;
  onDeviceConnected?: (device: MIDIDevice) => void;
  onDeviceDisconnected?: (device: MIDIDevice) => void;
}

export interface UseMIDIReturn {
  isInitialized: boolean;
  isSupported: boolean;
  error: string | null;
  devices: MIDIDevice[];
  inputDevices: MIDIDevice[];
  outputDevices: MIDIDevice[];
  mappingEngine: MIDIMappingEngine;
  initialize: () => Promise<void>;
  dispose: () => void;
  sendMessage: (deviceId: string, data: number[]) => void;
  sendNoteOn: (deviceId: string, channel: number, note: number, velocity: number) => void;
  sendNoteOff: (deviceId: string, channel: number, note: number, velocity?: number) => void;
  sendCC: (deviceId: string, channel: number, cc: number, value: number) => void;
  startLearn: (
    targetType: MIDIMapping['targetType'],
    targetId: string,
    targetParameter: string,
    onLearn?: (mapping: Partial<MIDIMapping>) => void
  ) => void;
  stopLearn: () => void;
  isLearning: boolean;
}

export function useMIDI(options: UseMIDIOptions = {}): UseMIDIReturn {
  const { autoConnect = true, onMessage, onDeviceConnected, onDeviceDisconnected } = options;

  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MIDIDevice[]>([]);
  const [isLearning, setIsLearning] = useState(false);

  const controllerRef = useRef<MIDIController | null>(null);
  const mappingEngineRef = useRef<MIDIMappingEngine>(new MIDIMappingEngine());

  const isSupported = MIDIController.isSupported();

  /**
   * Initialize MIDI controller
   */
  const initialize = useCallback(async () => {
    if (!isSupported) {
      setError('Web MIDI API is not supported in this browser');
      return;
    }

    try {
      // Dispose existing controller
      if (controllerRef.current) {
        controllerRef.current.dispose();
      }

      // Create new controller
      const controller = new MIDIController();
      await controller.initialize();

      // Set up message handler
      controller.onMessage((message) => {
        // Process message through mapping engine
        mappingEngineRef.current.processMIDIMessage(message);

        // Call external callback
        if (onMessage) {
          onMessage(message);
        }

        // Update learn state
        if (mappingEngineRef.current.isLearning()) {
          setIsLearning(true);
        } else {
          setIsLearning(false);
        }
      });

      // Set up device callbacks
      controller.onDeviceConnected((device) => {
        setDevices(controller.getAllDevices());
        if (onDeviceConnected) {
          onDeviceConnected(device);
        }
      });

      controller.onDeviceDisconnected((device) => {
        setDevices(controller.getAllDevices());
        if (onDeviceDisconnected) {
          onDeviceDisconnected(device);
        }
      });

      // Update devices list
      setDevices(controller.getAllDevices());

      controllerRef.current = controller;
      setIsInitialized(true);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize MIDI';
      setError(errorMessage);
      setIsInitialized(false);
    }
  }, [isSupported, onMessage, onDeviceConnected, onDeviceDisconnected]);

  /**
   * Dispose MIDI controller
   */
  const dispose = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.dispose();
      controllerRef.current = null;
    }
    setIsInitialized(false);
    setDevices([]);
  }, []);

  /**
   * Send MIDI message
   */
  const sendMessage = useCallback((deviceId: string, data: number[]) => {
    if (controllerRef.current) {
      controllerRef.current.sendMessage(deviceId, data);
    }
  }, []);

  /**
   * Send Note On
   */
  const sendNoteOn = useCallback(
    (deviceId: string, channel: number, note: number, velocity: number) => {
      if (controllerRef.current) {
        controllerRef.current.sendNoteOn(deviceId, channel, note, velocity);
      }
    },
    []
  );

  /**
   * Send Note Off
   */
  const sendNoteOff = useCallback(
    (deviceId: string, channel: number, note: number, velocity: number = 0) => {
      if (controllerRef.current) {
        controllerRef.current.sendNoteOff(deviceId, channel, note, velocity);
      }
    },
    []
  );

  /**
   * Send CC
   */
  const sendCC = useCallback((deviceId: string, channel: number, cc: number, value: number) => {
    if (controllerRef.current) {
      controllerRef.current.sendCC(deviceId, channel, cc, value);
    }
  }, []);

  /**
   * Start MIDI learn mode
   */
  const startLearn = useCallback(
    (
      targetType: MIDIMapping['targetType'],
      targetId: string,
      targetParameter: string,
      onLearn?: (mapping: Partial<MIDIMapping>) => void
    ) => {
      mappingEngineRef.current.startLearn(targetType, targetId, targetParameter, onLearn);
      setIsLearning(true);
    },
    []
  );

  /**
   * Stop MIDI learn mode
   */
  const stopLearn = useCallback(() => {
    mappingEngineRef.current.stopLearn();
    setIsLearning(false);
  }, []);

  /**
   * Auto-connect on mount
   */
  useEffect(() => {
    if (autoConnect && isSupported) {
      initialize();
    }

    return () => {
      dispose();
    };
  }, [autoConnect, isSupported, initialize, dispose]);

  // Get input and output devices
  const inputDevices = devices.filter(d => d.type === 'input');
  const outputDevices = devices.filter(d => d.type === 'output');

  return {
    isInitialized,
    isSupported,
    error,
    devices,
    inputDevices,
    outputDevices,
    mappingEngine: mappingEngineRef.current,
    initialize,
    dispose,
    sendMessage,
    sendNoteOn,
    sendNoteOff,
    sendCC,
    startLearn,
    stopLearn,
    isLearning,
  };
}
