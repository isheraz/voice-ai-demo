'use client'

import React, { useRef, useState } from "react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SpeechInput() {
    const [isRecording, setIsRecording] = useState(false)
    const [jobPost, setJobPost] = useState("");
    const [loading, setLoading] = useState(false);
    const [audioURL, setAudioURL] = useState<string | null>(null) // URL for playback

  
    const mediaRecorderRef = useRef<MediaRecorder | null>(null) // Use ref for MediaRecorder
    const audioChunksRef = useRef<Blob[]>([]) // Use ref for audio chunks
  
    const startRecording = async () => {
      setIsRecording(true)
      audioChunksRef.current = []
  
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
  
        mediaRecorderRef.current = mediaRecorder // Save MediaRecorder to ref
  
        mediaRecorder.ondataavailable = (e) => {
          audioChunksRef.current.push(e.data)
        }
  
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" })
        //   sendAudioToBackend(audioBlob) // Auto Send on Stop
          const audioURL = URL.createObjectURL(audioBlob)
          setAudioURL(audioURL) // Save the audio URL for playback
        }
  
        mediaRecorder.start()
      } catch (error) {
        console.error("Error accessing microphone:", error)
      }
    }
  
    const stopRecording = () => {
      setIsRecording(false)
      mediaRecorderRef.current?.stop() // Use ref to access MediaRecorder
    }
  
    const sendAudioToBackend = async () => {
        if (!audioURL) return

      setLoading(true)
  
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" })
      const formData = new FormData()
      formData.append("audio", audioBlob, "audio.wav")
  
      try {
        const response = await axios.post("/api/transcribe", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        setJobPost(response.data.jobPost)
      } catch (error) {
        console.error("Error sending audio to backend:", error)
      } finally {
        setLoading(false)
      }
    }
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Generate a Job Post</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-full ${isRecording ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}
          disabled={loading}
        >
          {isRecording ? "Stop Recording" : "Start Recording"}
        </Button>
        {audioURL && (
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Playback Recording:</h3>
            <audio controls src={audioURL} className="w-full"></audio>
            <Button
              onClick={sendAudioToBackend}
              className="w-full mt-4 bg-blue-500 hover:bg-blue-600"
              disabled={loading}
            >
              Submit for Transcription
            </Button>
          </div>
        )}
        {loading && <p className="mt-4 text-center">Processing your audio...</p>}
        {jobPost && (
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Generated Job Post:</h3>
            <Textarea
              readOnly
              value={jobPost}
              className="w-full h-32"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

