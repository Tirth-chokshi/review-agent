import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

export class AIService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required in environment variables');
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
  }

  async analyzeReview(review) {
    try {
      const reviewText = review.comment || '';
      const replyText = review.reviewReply?.comment || '';
      const rating = review.starRating || 0;
      
      // Create analysis prompt
      const prompt = this.createAnalysisPrompt(reviewText, replyText, rating);
      
      // Generate analysis
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the JSON response
      return this.parseAnalysisResponse(text);
      
    } catch (error) {
      console.error('AI Analysis Error:', error.message);
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  createAnalysisPrompt(reviewText, replyText, rating) {
    return `
Analyze this Google Business review and provide a structured JSON response.

Review Details:
- Rating: ${rating}/5 stars
- Review Text: "${reviewText}"
- Business Reply: "${replyText || 'No reply'}"

Please analyze and return a JSON object with the following structure:
{
  "summary": "Brief 2-3 sentence summary of the review",
  "sentiment": "Positive|Negative|Neutral",
  "tags": ["tag1", "tag2", "tag3"],
  "replySummary": "Brief summary of business reply (if exists)",
  "replySentiment": "Professional|Defensive|Apologetic|Grateful|N/A"
}

Guidelines:
- Summary should capture the main points and customer experience
- Sentiment should reflect the overall tone of the review
- Tags should be 3-5 relevant keywords (e.g., "service", "food quality", "staff", "cleanliness", "pricing")
- If no reply exists, set replySummary to empty string and replySentiment to "N/A"
- Keep tags concise and relevant to business operations
- Ensure the response is valid JSON format

Return only the JSON object, no additional text.
`;
  }

  parseAnalysisResponse(responseText) {
    try {
      // Clean the response text
      let cleanText = responseText.trim();
      
      // Remove markdown code blocks if present
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\n?/, '').replace(/\n?```$/, '');
      }
      
      // Parse JSON
      const analysis = JSON.parse(cleanText);
      
      // Validate required fields
      const requiredFields = ['summary', 'sentiment', 'tags', 'replySummary', 'replySentiment'];
      for (const field of requiredFields) {
        if (!(field in analysis)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      // Ensure tags is an array
      if (!Array.isArray(analysis.tags)) {
        analysis.tags = [];
      }
      
      // Validate sentiment values
      const validSentiments = ['Positive', 'Negative', 'Neutral'];
      if (!validSentiments.includes(analysis.sentiment)) {
        analysis.sentiment = 'Neutral';
      }
      
      const validReplySentiments = ['Professional', 'Defensive', 'Apologetic', 'Grateful', 'N/A'];
      if (!validReplySentiments.includes(analysis.replySentiment)) {
        analysis.replySentiment = 'N/A';
      }
      
      return analysis;
      
    } catch (error) {
      console.error('Error parsing AI response:', error.message);
      console.error('Raw response:', responseText);
      
      // Return fallback analysis
      return {
        summary: 'Analysis parsing failed',
        sentiment: 'Neutral',
        tags: ['parsing-error'],
        replySummary: '',
        replySentiment: 'N/A'
      };
    }
  }

  // Batch analyze multiple reviews
  async analyzeReviews(reviews) {
    const results = [];
    
    for (const review of reviews) {
      try {
        const analysis = await this.analyzeReview(review);
        results.push({
          reviewId: review.reviewId,
          success: true,
          analysis
        });
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        results.push({
          reviewId: review.reviewId,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // Test the AI service
  async testConnection() {
    try {
      const testReview = {
        comment: "Great service and delicious food! The staff was very friendly.",
        starRating: 5,
        reviewReply: {
          comment: "Thank you so much for your kind words! We appreciate your business."
        }
      };
      
      const result = await this.analyzeReview(testReview);
      return {
        success: true,
        result,
        message: 'AI service is working correctly'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'AI service test failed'
      };
    }
  }
}

export default AIService;
