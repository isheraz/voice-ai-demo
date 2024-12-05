import { NextApiRequest, NextApiResponse } from "next";
// import StreamPot from "@streampot/client";
import multer from "multer";
import OpenAI from 'openai';
import path from "path";
import fs from "fs";
import { Transcription } from "openai/resources/audio/transcriptions.mjs";


// Initialize StreamPot client
// const streampot = new StreamPot({
//   secret: process.env.STREAMPOT_API_KEY || "", // Ensure this is set in your .env.local
// });

// TypeScript types
type TranscriptionResponse = {
  jobPost: string;
};

type ErrorResponse = {
  error: string;
};

// Disable Next.js default bodyParser to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Multer middleware to handle file uploads in Next.js
 */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "/tmp"); // Directory to store files
  },
  filename: (req, file, cb) => {
    // Use the original file name with its extension
    const ext = path.extname(file.originalname); // Extract extension
    const name = path.basename(file.originalname, ext); // Extract name without extension
    cb(null, `${name}-${Date.now()}${ext}`); // Append a timestamp to the file name
  },
});

// Initialize multer with custom storage
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "audio/flac",
      "audio/m4a",
      "audio/mp3",
      "audio/mp4",
      "audio/mpeg",
      "audio/mpga",
      "audio/oga",
      "audio/ogg",
      "audio/wav",
      "audio/webm",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file format"));
    }
  },
});

// const upload = multer({ dest: "/tmp" });
const multerMiddleware = (
  req: NextApiRequest,
  res: NextApiResponse,
  next: (err?: Error | null) => void
) => {
  upload.single("audio")(req, res, (err: Error | null) => {
    if (err) {
      res.status(500).json({ error: "File upload failed" });
      return;
    }
    next(err);
  });
};

/**
 * Promisify middleware for easier integration with async/await
 */
const runMiddleware = (
  req: NextApiRequest,
  res: NextApiResponse,
  fn: (req: NextApiRequest, res: NextApiResponse, next: (err?: unknown) => void) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: unknown) => {
      if (result instanceof Error) {
        return reject(result);
      }
      resolve();
    });
  });
};


// Retry logic for OpenAI API
const retry = async (fn: () => Promise<unknown>, retries = 3): Promise<Transcription> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 1) throw error;
    console.warn("Retrying API request...");
    return retry(fn, retries - 1);
  }
};

    //  // Transcribe audio using OpenAI Whisper

/**
 * Function to convert audio using StreamPot
 */
// const convertToWavWithStreamPot = async (inputPath: string): Promise<string> => {
//   console.log("Uploading audio to StreamPot...");
//   const response = await streampot
//     .input(inputPath) // Input the local file path
//     .setStartTime(0) // Optional: Adjust the start time
//     .output("converted.wav") // Desired output file name
//     .runAndWait();

//   const outputUrl = response.outputs["converted.wav"];
//   if (!outputUrl) {
//     throw new Error("Failed to convert audio with StreamPot.");
//   }
//   console.log("Audio converted. Output URL:", outputUrl);
//   return outputUrl;
// };

/**
 * Main handler function
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TranscriptionResponse | ErrorResponse>
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    // Run the multer middleware to handle file upload
    await runMiddleware(req, res, multerMiddleware);

    // eslint-disable-next-line
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = file.path;

    console.log("Converting audio...");
    // const convertedAudioUrl = await convertToWavWithStreamPot(filePath);

    console.log("Sending transcription request...");
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
    });
    // const transcriptionResponse = await openai.audio.transcriptions.create({
    //   file: convertedAudioUrl,
    //   model: "whisper-1",
    // });

    const transcriptionResponse:Transcription = await retry(() =>
      openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-1",
      }), 2
    );

    // Transcribe audio using OpenAI Whisper
    // const transcriptionResponse = await openai.audio.transcriptions.create({
    //   file: fs.createReadStream(filePath),
    //   model: "whisper-1",
    // });


    const transcriptionText = transcriptionResponse.text;
    console.log("🚀 ~ transcriptionText:", transcriptionText)

    console.log("Generating job post...");
    const completionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      // model: "o1-mini",
      messages: [
        { role: "system", content: "Generate a job post from user input." },
        { role: "user", content: transcriptionText },
      ],
    });

    const jobPost = completionResponse.choices[0]?.message?.content || "";

    if (!jobPost) {
      throw new Error("No content generated from GPT-4.");
    }

    res.status(200).json({ jobPost });
  } catch (error) {
    console.error("Error processing transcription:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
