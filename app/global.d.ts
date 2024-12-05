// global.d.ts
interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }

  declare interface SpeechRecognitionEvent extends Event {
    readonly results: SpeechRecognitionResultList;
    // eslint-disable-next-line
    readonly interpretation: any;
    readonly emma: Document;
  }