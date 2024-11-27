import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";

// Initialize multer for handling file uploads
const upload = multer({ dest: "/tmp" });
// Initialize OpenAI configuration
const configuration = {
  apiKey: process.env.OPENAI_API_KEY || "",
};
const openai = new OpenAI(configuration);

// TypeScript types for request and response
type TranscriptionResponse = {
  jobPost: string;
};

type ErrorResponse = {
  error: string;
};

export const config = {
  api: {
    bodyParser: false, // Disable Next.js default bodyParser to handle multipart/form-data
  },
};

/**
 * Custom middleware to handle Multer file uploads
 * Adapts Multer to work with Next.js
 */
const multerMiddleware = (req: NextApiRequest, res: NextApiResponse,   next: (err?: Error | null) => void) => {
  upload.single("audio")(req, res, (err) => {
    if (err) {
      return res.status(500).json({ error: "File upload failed" });
    }
    next();
  });
};

// Promisify the middleware
const runMiddleware = (
  req: NextApiRequest, 
  res: NextApiResponse, 
  fn: (req: NextApiRequest, res: NextApiResponse, next: (err?: unknown) => void) => void
) =>
  new Promise((resolve, reject) => {
    fn(req, res, (result: unknown) => {
      if (result instanceof Error) {
        return reject(result);
      }
      resolve(result);
    });
  });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TranscriptionResponse | ErrorResponse>
): Promise<void> {
  console.log("testing API")
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    // Run the multer middleware to handle the file upload
    await runMiddleware(req, res, multerMiddleware);

    // Access the uploaded file
    const filePath = (req).file?.path;

    // Transcribe audio using OpenAI Whisper
    const transcriptionResponse = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1"
    }
    );

    const transcriptionText = transcriptionResponse.text;

    // Generate job post using GPT-4
    const completionResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "Generate a job post from user input." },
        { role: "user", content: transcriptionText },
      ],
    });

    const jobPost = completionResponse.choices[0]?.message?.content || "";

    if (!jobPost) {
      throw new Error("No content generated from GPT-4.");
    }

    // Send job post as response
    res.status(200).json({ jobPost });
  } catch (error) {
    console.error("Error processing transcription:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
