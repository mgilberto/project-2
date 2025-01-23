import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Plus, Trash2 } from 'lucide-react';

interface MindFlowProps {
  tasks: string[];
  onTasksChange: (tasks: string[]) => void;
}

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

type SpeechRecognitionResultList = {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

type SpeechRecognitionResult = {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
}

type SpeechRecognitionErrorEvent = {
  error: 'no-speech' | 'audio-capture' | 'not-allowed' | 'network' | string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (event: Event) => void;
  onend: (event: Event) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function MindFlow({ tasks, onTasksChange }: MindFlowProps) {
  const [phrases, setPhrases] = useState<string[]>(() => {
    const savedPhrases = localStorage.getItem('hippoplan_mindflow_phrases');
    return savedPhrases ? JSON.parse(savedPhrases) : tasks.length > 0 ? tasks : [''];
  });

  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const phrasesRef = useRef<string[]>([]);
  const hasSpokenRef = useRef(false);

  // Keep phrasesRef in sync with phrases state
  useEffect(() => {
    phrasesRef.current = phrases;
  }, [phrases]);

  // Persist phrases to localStorage
  useEffect(() => {
    localStorage.setItem('hippoplan_mindflow_phrases', JSON.stringify(phrases));
  }, [phrases]);

  // Sync tasks with parent
  useEffect(() => {
    const nonEmptyPhrases = phrases.filter(phrase => phrase.trim() !== '');
    if (nonEmptyPhrases.length > 0 || tasks.length > 0) {
      onTasksChange(nonEmptyPhrases);
    }
  }, [phrases, onTasksChange]);

  // Initialize from tasks if they change externally
  useEffect(() => {
    if (tasks.length > 0 && !phrases.some(p => p.trim() !== '')) {
      setPhrases(tasks);
    }
  }, [tasks]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startTimer = () => {
    setTimeLeft(120); // 2 minutes in seconds
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimeLeft(null);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updatePhrases = (newPhrases: string[], keepEmpty: boolean = false) => {
    // Only clean up empty fields if keepEmpty is false
    let finalPhrases = [...newPhrases];
    if (!keepEmpty) {
      // Keep only non-empty phrases and the last empty field if it exists
      const nonEmptyPhrases = finalPhrases.filter((p, i) => 
        p?.trim() || (i === finalPhrases.length - 1 && isListening)
      );
      finalPhrases = nonEmptyPhrases;
    }
    
    // Update both the ref and the state
    phrasesRef.current = finalPhrases;
    setPhrases(finalPhrases);
    
    // Notify parent of changes, filtering out empty phrases
    const nonEmptyPhrases = finalPhrases.filter(p => p?.trim());
    onTasksChange(nonEmptyPhrases);
    
    console.log('Updated phrases:', {
      finalPhrases,
      nonEmptyPhrases,
      keepEmpty
    });
  };

  const addEmptyField = () => {
    const currentPhrases = [...phrasesRef.current];
    currentPhrases.push('');
    const newIndex = currentPhrases.length - 1;
    console.log('Adding empty field:', {
      currentPhrases,
      newIndex
    });
    updatePhrases(currentPhrases, true);
    return newIndex;
  };

  const updateField = (index: number, text: string) => {
    const currentPhrases = [...phrasesRef.current];
    console.log('Updating field:', {
      index,
      text,
      currentPhrases
    });
    
    // Ensure the index is valid
    if (index >= 0 && index < currentPhrases.length) {
      currentPhrases[index] = text;
      updatePhrases(currentPhrases, true);
      console.log('Field updated successfully');
      return true;
    }
    
    console.log('Invalid field index, update failed');
    return false;
  };

  const removePhrase = (index: number) => {
    const newPhrases = phrases.filter((_, i) => i !== index);
    updatePhrases(newPhrases);
  };

  const startListening = async () => {
    setError(null);
    hasSpokenRef.current = false;
    startTimer();
    console.log('=== Speech Recognition Debug Log ===');
    console.log('1. Starting recognition process');
    
    if (!('webkitSpeechRecognition' in window)) {
      console.error('Browser does not support webkitSpeechRecognition');
      setError('Speech recognition is not supported in your browser. Please use Chrome.');
      return;
    }
    console.log('2. Browser supports speech recognition');

    try {
      console.log('3. Requesting microphone permission');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      console.log('4. Microphone permission granted');
    } catch (err) {
      console.error('5. Microphone permission error:', err);
      setError('Please allow microphone access to use speech recognition. Click the camera icon in your browser\'s address bar to enable it.');
      return;
    }

    try {
      if (recognitionRef.current) {
        console.log('6. Stopping existing recognition');
        recognitionRef.current.stop();
      }

      console.log('7. Creating new recognition instance');
      const recognition = new (window as any).webkitSpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      console.log('8. Recognition configured:', {
        continuous: recognition.continuous,
        interimResults: recognition.interimResults,
        lang: recognition.lang
      });

      let currentFieldIndex = -1;

      recognition.onstart = () => {
        console.log('9. Recognition started - speak now');
        setIsListening(true);
        setError(null);
        // Create initial empty field
        currentFieldIndex = addEmptyField();
        console.log('Created initial field at index:', currentFieldIndex);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('10. Recognition error:', {
          error: event.error,
          message: event.message
        });
        
        if (event.error === 'not-allowed') {
          setError('Microphone access was denied. Please allow microphone access in your browser settings and try again.');
        } else if (event.error === 'no-speech') {
          setError('No speech was detected. Please try speaking again.');
        } else if (event.error === 'audio-capture') {
          setError('No microphone was found. Please ensure your microphone is connected and working.');
        } else if (event.error === 'network') {
          setError('Network error occurred. Please ensure you are using HTTPS and have a stable internet connection. If the error persists, try refreshing the page.');
        } else {
          setError(`Speech recognition error: ${event.error}. Please try again.`);
        }
        stopListening();
      };

      recognition.onend = () => {
        console.log('11. Recognition ended');
        
        // If we're still supposed to be listening, restart recognition
        if (isListening) {
          console.log('Restarting recognition...');
          recognition.start();
          return;
        }
        
        setIsListening(false);
        setInterimTranscript('');
        
        // Clean up any empty fields when stopping
        console.log('Cleaning up empty fields...');
        const newPhrases = phrasesRef.current.filter(phrase => phrase?.trim());
        updatePhrases(newPhrases, false);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log('12. Got speech result:', {
          resultCount: event.results?.length,
          resultIndex: event.resultIndex,
          currentField: currentFieldIndex,
          phrases: phrasesRef.current,
          results: Array.from(event.results).map(result => ({
            isFinal: result.isFinal,
            transcript: result[0]?.transcript
          }))
        });

        if (!event.results?.length) {
          console.log('No results found in event');
          return;
        }

        // Handle each result
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          
          if (result.isFinal) {
            const text = result[0].transcript.trim();
            if (!text) {
              console.log('Skipping empty result');
              continue;
            }
            
            console.log('13. Final text received:', text);
            console.log('Current field index:', currentFieldIndex);
            
            // Update the current field with the text
            if (currentFieldIndex !== -1) {
              const updated = updateField(currentFieldIndex, text);
              if (updated) {
                console.log('14. Updated field', currentFieldIndex, 'with text:', text);
                
                // Create a new field for the next phrase
                currentFieldIndex = addEmptyField();
                console.log('15. Created new field at index:', currentFieldIndex);
                hasSpokenRef.current = true;
              }
            }
          } else {
            const interimText = result[0].transcript;
            console.log('16. Interim text:', interimText);
            setInterimTranscript(interimText);
          }
        }
      };

      console.log('17. Starting recognition...');
      recognition.start();
      
    } catch (error) {
      console.error('18. Error initializing speech recognition:', error);
      setError('Error starting speech recognition. Please try again.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      stopTimer();
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Mind Flow</h2>
        <p className="text-sm sm:text-base text-gray-600">
          Take 2 minutes to say all of the tasks you can think of that you want to work on this week. Each task will be captured in a new field.
        </p>
      </div>

      <div className="space-y-3">
        {phrases.map((phrase, index) => (
          <div key={`phrase-${index}`} className="flex gap-2">
            <input
              type="text"
              value={phrase || ''}
              onChange={(e) => {
                const text = e.target.value;
                updateField(index, text);
              }}
              className="flex-1 p-3 sm:p-2 text-base sm:text-sm border rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Speak or type your task..."
            />
            <button
              onClick={() => removePhrase(index)}
              className="p-3 sm:p-2 text-red-500 hover:text-red-600 touch-manipulation"
              title="Remove task"
            >
              <Trash2 className="w-6 h-6 sm:w-5 sm:h-5" />
            </button>
          </div>
        ))}

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 mt-4">
          <button
            onClick={addEmptyField}
            className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 active:bg-purple-100 touch-manipulation"
          >
            <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
            Add New Task
          </button>

          <div className="flex flex-col items-center gap-2">
            {timeLeft !== null && (
              <div className={`text-lg font-medium ${
                timeLeft <= 30 ? 'text-red-500' : 'text-purple-600'
              }`}>
                {formatTime(timeLeft)}
              </div>
            )}
            <button
              onClick={isListening ? stopListening : startListening}
              className={`flex items-center justify-center gap-2 px-4 py-3 sm:py-2 text-white rounded-lg transition-colors touch-manipulation w-full ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 active:bg-red-700' 
                  : 'bg-purple-500 hover:bg-purple-600 active:bg-purple-700'
              }`}
              title={isListening ? 'Stop listening' : 'Start listening'}
              disabled={!!error}
            >
              {isListening ? (
                <>
                  <MicOff className="w-5 h-5 sm:w-4 sm:h-4" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 sm:w-4 sm:h-4" />
                  Start Recording
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {isListening && interimTranscript && (
        <div className="mt-4 p-3 sm:p-2 bg-purple-100 text-purple-700 rounded-md text-sm sm:text-base">
          Listening... <span className="italic">{interimTranscript}</span>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 sm:p-2 bg-red-100 text-red-700 rounded-md text-sm sm:text-base">
          {error}
        </div>
      )}
    </div>
  );
}