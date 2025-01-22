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
  error: 'no-speech' | 'audio-capture' | 'not-allowed' | string;
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
  const [phrases, setPhrases] = useState<string[]>(tasks || []);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const phrasesRef = useRef<string[]>([]);
  const hasSpokenRef = useRef(false);

  // Keep phrasesRef in sync with phrases state
  useEffect(() => {
    phrasesRef.current = phrases;
  }, [phrases]);

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
    setError('');
    hasSpokenRef.current = false;
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
        setError('');
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
    console.log('19. Stopping recognition');
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setInterimTranscript('');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Mind Flow</h2>
        <p className="text-gray-600">Speak your tasks. Each task will be captured in a new field.</p>
      </div>

      <div className="space-y-2">
        {phrases.map((phrase, index) => (
          <div key={`phrase-${index}`} className="flex gap-2">
            <input
              type="text"
              value={phrase || ''}
              onChange={(e) => {
                const text = e.target.value;
                updateField(index, text);
              }}
              className="flex-1 p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Speak or type your task..."
            />
            <button
              onClick={() => removePhrase(index)}
              className="p-2 text-red-500 hover:text-red-600"
              title="Remove task"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}

        <div className="flex gap-2">
          <button
            onClick={addEmptyField}
            className="flex items-center gap-2 px-4 py-2 text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50"
          >
            <Plus className="w-4 h-4" />
            Add New Task
          </button>

          <button
            onClick={isListening ? stopListening : startListening}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-purple-500 hover:bg-purple-600'
            }`}
            title={isListening ? 'Stop listening' : 'Start listening'}
            disabled={!!error}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Start Recording
              </>
            )}
          </button>
        </div>
      </div>

      {isListening && interimTranscript && (
        <div className="mt-4 p-2 bg-purple-100 text-purple-700 rounded-md text-sm">
          Listening... <span className="italic">{interimTranscript}</span>
        </div>
      )}

      {error && (
        <div className="mt-4 p-2 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
    </div>
  );
}