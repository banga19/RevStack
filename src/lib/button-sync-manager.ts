import { useState, useCallback, useEffect, useRef } from "react";

// Button event types
export interface ButtonEvent {
  id: string;
  timestamp: number;
  elementId: string;
  elementType: string;
  pagePath: string;
  actionType: string;
  target: string;
  parameters: Record<string, any>;
  source: "user" | "system" | "qme-trigger";
  context: Record<string, any>;
}

// Button sync state
export interface ButtonSyncState {
  lastEvent: ButtonEvent | null;
  eventHistory: ButtonEvent[];
  pendingActions: any[];
  isSyncing: boolean;
  syncErrors: string[];
}

// Global button sync manager instance
class ButtonSyncManager {
  private state: ButtonSyncState;
  private listeners: Array<(state: ButtonSyncState) => void>;
  private isInitialized: boolean;
  private contextRef: { current: Record<string, any> };

  constructor() {
    this.state = {
      lastEvent: null,
      eventHistory: [],
      pendingActions: [],
      isSyncing: false,
      syncErrors: [],
    };
    this.listeners = [];
    this.isInitialized = false;
    this.contextRef = { current: {} };
  }

  // Initialize the button sync manager
  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.updateContext({
      initializedAt: Date.now(),
      version: "1.0.0"
    });
  }

  // Update global context
  updateContext(contextUpdates: Record<string, any>) {
    this.contextRef.current = {
      ...this.contextRef.current,
      ...contextUpdates
    };
    this.notifyListeners();
  }

  // Get current context
  getContext(): Record<string, any> {
    return { ...this.contextRef.current };
  }

  // Handle button click event
  handleButtonClick = async (
    elementId: string,
    elementType: string,
    pagePath: string,
    actionType: string,
    target: string,
    parameters: Record<string, any> = {},
    source: "user" | "system" | "qme-trigger" = "user"
  ): Promise<any> => {
    // Create button event
    const event: ButtonEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      elementId,
      elementType,
      pagePath,
      actionType,
      target,
      parameters,
      source,
      context: this.getContext()
    };

    // Update state with new event
    this.state.eventHistory = [event, ...this.state.eventHistory.slice(0, 99)];
    this.state.lastEvent = event;
    this.state.isSyncing = true;

    try {
      // Get enhanced button action using LangChain/RAG (dynamically imported)
      let buttonAction = {
        actionType: "navigate",
        target: target || pagePath,
        parameters: {},
        confidence: 1.0,
        reasoning: "Default button action"
      };

      try {
        // Dynamically import langchain service using dynamic import with a literal
        // string so webpack does not eagerly bundle the server-only @langchain/openai
        // dependency into client-side code, while still being statically analyzable.
        const langchainModule = await import("./langchain-service");
        const lcService = langchainModule.default || langchainModule;

        if (lcService && typeof lcService.getEnhancedButtonAction === 'function') {
          const enhancedAction = await lcService.getEnhancedButtonAction(
            this.getContext(),
            `Button clicked: ${elementId} (${elementType}) on ${pagePath}. Action: ${actionType} targeting ${target}`
          );
          // Map the response to a plain object to avoid type incompatibilities
          buttonAction = {
            actionType: enhancedAction.actionType,
            target: enhancedAction.target,
            parameters: enhancedAction.parameters || {},
            confidence: enhancedAction.confidence,
            reasoning: enhancedAction.reasoning,
          };
        }
      } catch (e) {
        // LangChain not available in client bundle, use default action
        console.log("LangChain not available client-side, using default button action");
      }

      // Add to pending actions
      this.state.pendingActions = [buttonAction, ...this.state.pendingActions.slice(0, 9)];

      // Simulate execution delay
      await new Promise(resolve => setTimeout(resolve, 50));

      // Remove from pending actions after execution
      this.state.pendingActions = this.state.pendingActions.filter(a => a !== buttonAction);

      // Update context with execution result
      this.updateContext({
        lastExecutedAction: buttonAction,
        lastExecutionTime: Date.now()
      });

      return buttonAction;
    } catch (error) {
      console.error("Button sync error:", error);
      this.state.syncErrors = [`Error processing button click: ${error}`, ...this.state.syncErrors.slice(0, 9)];

      return {
        actionType: "navigate",
        target: pagePath,
        parameters: {},
        confidence: 0.5,
        reasoning: "Fallback due to processing error"
      };
    } finally {
      this.state.isSyncing = false;
      this.notifyListeners();
    }
  };

  // Get button sync state
  getState(): ButtonSyncState {
    return {
      ...this.state,
      eventHistory: [...this.state.eventHistory],
      pendingActions: [...this.state.pendingActions],
      syncErrors: [...this.state.syncErrors]
    };
  }

  // Subscribe to state changes
  subscribe(listener: (state: ButtonSyncState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of state change
  private notifyListeners() {
    const stateCopy = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(stateCopy);
      } catch (error) {
        console.error("Error in button sync listener:", error);
      }
    });
  }

  // Clear history and reset state
  clearHistory() {
    this.state.eventHistory = [];
    this.state.pendingActions = [];
    this.state.syncErrors = [];
    this.state.lastEvent = null;
    this.notifyListeners();
  }
}

// Export singleton instance
export const buttonSyncManager = new ButtonSyncManager();

// Custom hook for using button sync in components
export const useButtonSync = () => {
  const [state, setState] = useState(() => buttonSyncManager.getState());

  useEffect(() => {
    const unsubscribe = buttonSyncManager.subscribe(setState);
    return unsubscribe;
  }, []);

  const handleButtonClick = useCallback(buttonSyncManager.handleButtonClick, []);

  const updateContext = useCallback((context: Record<string, any>) => {
    buttonSyncManager.updateContext(context);
  }, []);

  return {
    state,
    handleButtonClick,
    updateContext,
    getContext: buttonSyncManager.getContext.bind(buttonSyncManager),
    clearHistory: buttonSyncManager.clearHistory.bind(buttonSyncManager)
  };
};

export default ButtonSyncManager;
