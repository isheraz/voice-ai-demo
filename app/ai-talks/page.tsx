'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SpeechRecognition =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

const synth = typeof window !== 'undefined' && window.speechSynthesis;

export default function JobPostAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [aiResponse, setAiResponse] = useState('Hello! What is your name?');
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Speak a given text using Speech Synthesis
  const speak = (text: string) => {
    if (synth) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      synth.speak(utterance);
    }
  };

  // Speak the initial message when the component mounts
  useEffect(() => {
    speak(aiResponse);
  }, []);

  const handleSpeechRecognition = () => {
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setUserInput('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('');
      setUserInput(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
    };

    recognition.onend = async () => {
      setIsListening(false);
      if (userInput.trim()) {
        await handleUserResponse(userInput.trim());
      }
    };

    if (!isListening) {
      recognition.start();
    } else {
      recognition.stop();
    }
  };

  const handleUserResponse = async (response: string) => {
    if (!response) return;
    setLoading(true);

    try {
      if (!userName) {
        // Save user name and personalize next question
        setUserName(response);
        const nextMessage = `Nice to meet you, ${response}! What job are you looking to post?`;
        setAiResponse(nextMessage);
        speak(nextMessage);
      } else {
        // Send the user input to the backend and get AI response
        const apiResponse = await axios.post('/api/ask-ai', {
          userInput: response,
          userName,
        });
        const { message } = apiResponse.data;

        setAiResponse(message);
        speak(message);
      }
    } catch (error) {
      console.error('Error communicating with AI:', error);
      setAiResponse('Sorry, I could not process your request.');
      speak('Sorry, I could not process your request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Job Post Assistant</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-gray-700">{aiResponse}</p>
        <Textarea
          placeholder="Your input will appear here..."
          value={userInput}
          readOnly
          className="mb-4"
        />
        <div className="flex gap-4">
          <Button
            onMouseDown={handleSpeechRecognition}
            onMouseUp={handleSpeechRecognition}
            className={`flex-1 ${isListening ? 'bg-red-500' : 'bg-green-500'}`}
          >
            {isListening ? 'Release to Stop' : 'Hold to Speak'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
