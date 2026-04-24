import * as Clarity from '@microsoft/react-native-clarity';

const CLARITY_PROJECT_ID = 'wgoxraerys';
let currentClarityUserId: string | null = null;

let isClarityInitialized = false;

export function initializeClarity() {
  if (isClarityInitialized) {
    return;
  }

  Clarity.initialize(CLARITY_PROJECT_ID, {
    logLevel: Clarity.LogLevel.Verbose,
  });
  Clarity.setOnSessionStartedCallback(() => {
    if (currentClarityUserId) {
      void Clarity.setCustomUserId(currentClarityUserId);
    }
  });

  isClarityInitialized = true;
}

export function trackClarityScreen(screenName: string) {
  if (!isClarityInitialized) {
    return;
  }

  void Clarity.setCurrentScreenName(screenName);
}

export function setClarityUser(userId: string) {
  currentClarityUserId = userId;

  if (!isClarityInitialized) {
    return;
  }

  void Clarity.setCustomUserId(userId);
}

export function clearClarityUser() {
  currentClarityUserId = null;

  if (!isClarityInitialized) {
    return;
  }

  Clarity.startNewSession(() => {});
}

export { Clarity };
