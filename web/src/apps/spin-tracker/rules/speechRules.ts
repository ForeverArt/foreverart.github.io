/**
 * Compatibility wrapper — prefer evaluateAnalysisEvents + analysisEventsToSpeechKeys.
 */
export {
  evaluateAnalysisEvents as evaluateSpeechEvents,
  INITIAL_EVENT_STATE as INITIAL_SPEECH_RULE_STATE,
  type EventEngineState as SpeechRuleState,
  analysisEventsToSpeechKeys,
} from './eventEngine'
