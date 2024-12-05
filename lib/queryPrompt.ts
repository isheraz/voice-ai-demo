import OpenAI from "openai";

const questionsPrompt = `
You are a professional job post writer. Help the user write a clear and detailed job post by asking a series of relevant questions. 
After the user responds, summarize their answers into a structured job post format.

Begin by asking:
1. Job title
2. Location (Remote, on-site, or hybrid)
3. Job type (Full-time, part-time, contract, or internship)
4. Brief company description
5. Responsibilities
6. Requirements (skills, qualifications)

If the user provides incomplete information, ask clarifying questions like:
- "What are the primary responsibilities for this role?"
- "Do you want to include a salary range?"
- "Would you like to mention benefits like health insurance or flexible work hours?"

Respond with: "Let’s start! What is the title of the position you are hiring for?"
`;

export const generateResponse = async (userInput: string, conversationHistory: string[]) => {
    const configuration = {
        apiKey: process.env.OPENAI_API_KEY || "",
      };
      const openai = new OpenAI(configuration);
//   const response = await openai.chat.completions.create({
//     name: 'Joy',  
//     model: "gpt-4o",
//     messages: [
//       { role: "system", content: questionsPrompt },
//       ...conversationHistory.map((message) => ({ role: "user", content: message })),
//       { role: "user", content: userInput },
//     ],
//   });

//   return response.choices[0]?.message?.content || "";
};
