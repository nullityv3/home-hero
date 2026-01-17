/**
 * Debug version to see what's happening with the feedback system
 */

const fc = require('fast-check');

// Mock feedback system that simulates UI component behavior
class UserActionFeedbackSystem {
  constructor() {
    this.currentState = {
      isLoading: false,
      showSuccess: false,
      showError: false,
      hasVisualFeedback: false,
    };
  }

  async executeAction(action) {
    console.log('Executing action:', action);
    const timeline = [];
    
    // Initial state (before action)
    const initialFeedback = { ...this.currentState };
    timeline.push({ ...initialFeedback });
    console.log('Initial state:', initialFeedback);

    // Immediate feedback when action starts
    this.currentState = {
      ...this.currentState,
      hasVisualFeedback: true,
      isLoading: action.isAsync,
      feedbackType: action.isAsync ? 'loading' : 'animation',
      feedbackMessage: action.isAsync ? 'Processing...' : 'Action in progress...',
    };
    
    const duringActionFeedback = { ...this.currentState };
    timeline.push({ ...duringActionFeedback });
    console.log('During action state:', duringActionFeedback);

    // Simulate action execution time
    if (action.isAsync) {
      const duration = action.duration || 500;
      await new Promise(resolve => setTimeout(resolve, Math.min(duration, 50)));
    }

    // Final feedback based on action result
    if (action.shouldSucceed) {
      this.currentState = {
        ...this.currentState,
        isLoading: false,
        showSuccess: true,
        showError: false,
        feedbackType: 'success',
        feedbackMessage: 'Action completed successfully',
      };
    } else {
      this.currentState = {
        ...this.currentState,
        isLoading: false,
        showSuccess: false,
        showError: true,
        feedbackType: 'error',
        feedbackMessage: 'Action failed. Please try again.',
      };
    }

    const finalFeedback = { ...this.currentState };
    timeline.push({ ...finalFeedback });
    console.log('Final state:', finalFeedback);

    const result = {
      initialFeedback,
      duringActionFeedback,
      finalFeedback,
      feedbackTimeline: timeline,
    };
    
    console.log('Full result:', result);
    return result;
  }

  reset() {
    this.currentState = {
      isLoading: false,
      showSuccess: false,
      showError: false,
      hasVisualFeedback: false,
    };
  }
}

// Test a specific case
async function testSpecificCase() {
  const feedbackSystem = new UserActionFeedbackSystem();
  
  const action = {
    type: 'button_press',
    isAsync: false,
    shouldSucceed: false,
    duration: null
  };
  
  console.log('Testing specific failing case...');
  const result = await feedbackSystem.executeAction(action);
  
  console.log('\nChecking assertions:');
  console.log('duringActionFeedback.hasVisualFeedback:', result.duringActionFeedback.hasVisualFeedback);
  console.log('duringActionFeedback.feedbackType:', result.duringActionFeedback.feedbackType);
  console.log('finalFeedback.showError:', result.finalFeedback.showError);
  console.log('finalFeedback.showSuccess:', result.finalFeedback.showSuccess);
}

testSpecificCase();