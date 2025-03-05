// src/utils/deepseek.js
const fetch = require('node-fetch');

/**
 * Enhanced client for interacting with Deepseek models via OpenRouter
 * Implements OpenAI-compatible API format through OpenRouter
 */
class DeepseekClient {
  /**
   * Create a DeepseekClient instance
   * @param {string} apiKey - The OpenRouter API key
   * @param {string} endpoint - The API endpoint (defaults to OpenRouter)
   * @param {string} model - The model name to use (defaults to deepseek-r1)
   */
  constructor(apiKey, endpoint = 'https://openrouter.ai/api/v1/chat/completions', model = 'deepseek/deepseek-r1:free') {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
    this.model = model;
    this.siteUrl = 'https://ai-desktop-agent'; // Replace with your actual site URL
    this.siteName = 'AI Desktop Agent'; // Replace with your actual site name
    
    // Check if API key is missing or empty
    if (!apiKey || apiKey.trim() === '') {
      console.warn('WARNING: OpenRouter API key is missing - using mock responses instead');
      this.useMockResponses = true;
    } else {
      this.useMockResponses = false;
    }
    
    // Agent identity information
    this.agentInfo = {
      name: "AI Desktop Agent",
      version: "1.0.0",
      purpose: "I'm an AI desktop agent designed to help you automate tasks on your computer. I can analyze screen content, control your mouse and keyboard, and execute workflows based on visual information.",
      capabilities: [
        "Take screenshots of your desktop",
        "Analyze screen content to understand what's visible",
        "Automate mouse clicks and keyboard inputs",
        "Execute multi-step desktop workflows",
        "Break down complex tasks into simple steps",
        "Adapt to different applications and interfaces"
      ],
      limitations: [
        "I can only interact with what's visible on screen",
        "I need clear instructions for complex tasks",
        "I may require confirmation for certain actions",
        "I operate within the boundaries of your desktop environment"
      ]
    };
    
    console.log(`DeepseekClient initialized with OpenRouter, ${this.useMockResponses ? 'using mock responses' : 'using API endpoint'}`);
    console.log(`Target model: ${this.model}`);
  }

  /**
   * Detect if a query is asking about the agent itself
   * @param {string} query - The user query to analyze
   * @returns {boolean} - True if query is about the agent
   */
  isAgentInfoQuery(query) {
    if (!query) return false;
    
    const lowerQuery = query.toLowerCase();
    const selfReferentialPatterns = [
      'what can you do',
      'what are you',
      'who are you',
      'your purpose',
      'your capabilities',
      'what do you do',
      'how do you work',
      'how does this work',
      'what is this',
      'help me',
      'your function',
      'your features',
      'your abilities',
      'tell me about yourself',
      'introduce yourself',
      'your limitations',
      'what can\'t you do',
      'your name'
    ];
    
    return selfReferentialPatterns.some(pattern => lowerQuery.includes(pattern));
  }

  /**
   * Generate JSON-formatted analysis from a prompt
   * @param {string} prompt - The prompt to analyze
   * @param {number} retries - Number of retry attempts (default: 3)
   * @param {number} timeout - Request timeout in ms (default: 30000)
   * @returns {Object} - The parsed JSON response
   */
  async generateJSON(prompt, retries = 3, timeout = 30000) {
    // Check if we should use mock responses
    if (this.useMockResponses) {
      console.log('Using mock response for prompt:', prompt.substring(0, 100) + '...');
      return this.getMockResponse(prompt);
    }
    
    // Enhance the prompt based on its content
    const enhancedPrompt = this.enhancePrompt(prompt);
    
    let attempt = 0;
    
    while (attempt < retries) {
      attempt++;
      console.log(`API request attempt ${attempt}/${retries} to OpenRouter`);
      
      try {
        // Create an AbortController for timeout management
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        // OpenRouter request following OpenAI client format
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': this.siteUrl,
            'X-Title': this.siteName
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: "user", content: enhancedPrompt }
            ],
            temperature: 0.2,
            max_tokens: 4000
          }),
          signal: controller.signal
        });
        
        // Clear the timeout since the request completed
        clearTimeout(timeoutId);
        
        // Get the response text for better error messages
        const responseText = await response.text();
        
        if (!response.ok) {
          console.error(`API Error (${response.status}):`, responseText);
          
          if (attempt < retries) {
            console.log(`Retrying in ${attempt * 2} seconds...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            continue;
          }
          
          throw new Error(`OpenRouter API request failed with status ${response.status}`);
        }
        
        // Parse the JSON response (following OpenAI format)
        const responseData = JSON.parse(responseText);
        console.log("Raw API response received. First 500 chars:", JSON.stringify(responseData).substring(0, 500) + "...");
        
        if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
          throw new Error("Unexpected API response format");
        }
        
        const messageContent = responseData.choices[0].message.content;
        
        // If this was an agent info query, format the response appropriately
        if (this.isAgentInfoQuery(prompt)) {
          return this.formatAgentInfoResponse(messageContent);
        }
        
        return this.extractAndParseJSON(messageContent);
      } catch (error) {
        console.error(`API request error (attempt ${attempt}/${retries}):`, error.message);
        
        if (error.name === 'AbortError') {
          console.error(`Request timed out after ${timeout}ms`);
        }
        
        if (attempt < retries) {
          console.log(`Retrying in ${attempt * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          continue;
        }
        
        // If all retries failed, return a fallback response
        return this.isAgentInfoQuery(prompt) 
          ? this.createAgentInfoFallback()
          : this.createFallbackResponse(`API request failed after ${retries} attempts. Using fallback analysis.`);
      }
    }
  }

  /**
   * Get a mock response when no API key is available
   * @param {string} prompt - The original prompt
   * @returns {Object} - A mock response object
   */
  getMockResponse(prompt) {
    // For agent info queries, return the agent info
    if (this.isAgentInfoQuery(prompt)) {
      return this.createAgentInfoFallback();
    }
    
    // For regular tasks, return a basic task breakdown
    return {
      analysis: `I'll help you with "${prompt}". Without API access, I'll provide a basic response.`,
      steps: [
        {
          description: "Take a screenshot to analyze the current state",
          action: "screenshot",
          target: null
        },
        {
          description: "Wait briefly for system to stabilize",
          action: "wait",
          time: 1000
        },
        {
          description: "This is a mock step (API key not configured)",
          action: "mock",
          target: null
        }
      ]
    };
  }

  // Update the formatAgentInfoResponse method in DeepseekClient to enhance the display

/**
 * Format a response about the agent's capabilities
 * @param {string} responseText - The raw response from the API
 * @returns {Object} - Formatted response object
 */
formatAgentInfoResponse(responseText) {
  // Format the response to make it more readable
  const formattedResponse = responseText
    // Replace bullet points to improve readability
    .replace(/•/g, '• ')
    .replace(/\n- /g, '\n• ')
    .replace(/\* /g, '• ')
    // Add spacing after paragraphs
    .replace(/\n\n/g, '\n\n')
    // Ensure proper spacing after periods
    .replace(/\.(?=[A-Z])/g, '. ');
    
  return {
    analysis: formattedResponse,
    isAgentInfoResponse: true,
    steps: [
      {
        description: "Take a screenshot to help you visualize the current state",
        action: "screenshot",
        target: null
      }
    ]
  };
}

  /**
   * Create a fallback response about the agent when API fails
   * @returns {Object} - Fallback agent info response
   */
  createAgentInfoFallback() {
    return {
      analysis: `${this.agentInfo.purpose}\n\nI can help you with:\n` + 
                this.agentInfo.capabilities.map(c => `- ${c}`).join('\n') + 
                `\n\nMy limitations:\n` + 
                this.agentInfo.limitations.map(l => `- ${l}`).join('\n'),
      isAgentInfoResponse: true,
      steps: [
        {
          description: "Take a screenshot to help you visualize the current state",
          action: "screenshot",
          target: null
        }
      ]
    };
  }

  /**
   * Enhance a prompt with additional context based on its content
   * @param {string} prompt - The original prompt
   * @returns {string} - Enhanced prompt with additional context
   */
  enhancePrompt(prompt) {
    // If the query is about the agent itself, provide relevant context
    if (this.isAgentInfoQuery(prompt)) {
      return this.generateAgentInfoPrompt(prompt);
    }
    
    // For task-based prompts, use the structured format
    return this.generateStructuredPrompt(prompt);
  }

  /**
   * Generate a prompt specifically for agent information queries
   * @param {string} query - The original query about the agent
   * @returns {string} - Enhanced prompt with agent context
   */
  generateAgentInfoPrompt(query) {
    return `You are ${this.agentInfo.name}, an AI desktop automation agent. 
When responding to this query, speak in first person as if you are the AI agent running on the user's computer.

The user is asking: "${query}"

Respond conversationally as the AI desktop agent, using these facts about yourself:
- Your purpose: ${this.agentInfo.purpose}
- Your capabilities: ${this.agentInfo.capabilities.join(', ')}
- Your limitations: ${this.agentInfo.limitations.join(', ')}

Your response should be helpful, conversational, and reflect your identity as a desktop automation tool.
Do not mention that you're using an API or that you're running on a language model.
Speak as if you are directly the AI agent software that's installed on their computer.`;
  }

  /**
   * Generate a structured prompt for task analysis
   * @param {string} basePrompt - The original task prompt
   * @returns {string} - Enhanced prompt with clear instructions
   */
  generateStructuredPrompt(basePrompt) {
    return `
I need to break down this desktop automation task into vision-based steps:
"${basePrompt}"

I am ${this.agentInfo.name}, a desktop automation tool that can analyze screen content and perform actions.

Analyze this task and return a JSON object with the following structure:
{
  "analysis": "Brief analysis of what needs to be done",
  "steps": [
    {
      "description": "Clear description of the step",
      "action": "One of: click, type, screenshot, wait, press, scroll, dragdrop",
      "target": {"x": 100, "y": 200} or null depending on the action,
      "text": "Text to type if action is type",
      "time": 1000 if action is wait (milliseconds)
    }
  ]
}

Make sure each step is atomic and has exactly one clear action. All JSON fields must be properly formatted with no trailing commas.
`;
  }

  /**
   * Extract and parse JSON from API response text
   * Enhanced with multiple fallback strategies for robust parsing
   * @param {string} responseText - The response text to parse
   * @returns {Object} - The parsed JSON object
   */
  extractAndParseJSON(responseText) {
    if (!responseText) {
      console.error("Response text is empty");
      return this.createFallbackResponse("Empty response from API");
    }
    
    try {
      // First attempt: direct JSON parsing
      return JSON.parse(responseText);
    } catch (error) {
      console.log("Direct JSON parsing failed, trying alternatives...");
      
      try {
        // Second attempt: Try to extract JSON using regex
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (regexError) {
        console.log("JSON extraction with regex failed...");
      }
      
      try {
        // Third attempt: Fix common JSON syntax issues
        const fixedJson = responseText
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']');
        
        return JSON.parse(fixedJson);
      } catch (fixError) {
        console.log("JSON syntax fixing failed too...");
      }
      
      try {
        // Fourth attempt: If all else fails, try to create a valid JSON structure
        const lastOpenBrace = responseText.lastIndexOf('{');
        const lastCloseBrace = responseText.lastIndexOf('}');
        
        if (lastOpenBrace >= 0 && lastCloseBrace > lastOpenBrace) {
          const jsonSubstring = responseText.substring(lastOpenBrace, lastCloseBrace + 1);
          return JSON.parse(jsonSubstring);
        }
      } catch (substrError) {
        console.log("JSON substring extraction failed...");
      }
      
      try {
        // Fifth attempt: Try to extract a JSON-like structure and build it manually
        const analysisMatch = responseText.match(/["']analysis["']\s*:\s*["']([^"']*)["']/);
        if (analysisMatch && analysisMatch[1]) {
          return this.createFallbackResponse(analysisMatch[1]);
        }
      } catch (analysisError) {
        console.log("Analysis extraction failed...");
      }
      
      // If everything fails, create a fallback response
      console.error("Could not parse JSON. Original error:", error);
      return this.createFallbackResponse("Failed to parse API response. Using fallback analysis.");
    }
  }
  
  /**
   * Create a fallback response when parsing fails
   * @param {string} message - The message to include in the fallback
   * @returns {Object} - A structured fallback response
   */
  createFallbackResponse(message) {
    return {
      analysis: message,
      steps: [
        {
          description: "Take screenshot to assess current state",
          action: "screenshot",
          target: null
        },
        {
          description: "Wait for system to stabilize",
          action: "wait",
          time: 2000
        }
      ]
    };
  }

  /**
   * Analyze a screenshot using text content
   * @param {string} textContent - The text extracted from the screenshot
   * @param {string} task - The task description
   * @returns {Promise<Object>} - Analysis result
   */
  async analyzeScreenshot(textContent, task) {
    const prompt = `
I am ${this.agentInfo.name}, analyzing a screenshot with the following text content:

${textContent}

Based on this text content and the user's task: "${task}"

Analyze what's visible on screen and return a JSON object with:
{
  "analysis": "Detailed analysis of what's visible on screen and how it relates to the task",
  "elements": [
    {
      "type": "button|text|input|menu|link",
      "text": "Text of the element",
      "likely_location": "top-left|top|top-right|left|center|right|bottom-left|bottom|bottom-right",
      "confidence": 0.8,
      "relevance_to_task": "high|medium|low",
      "suggested_action": "click|type|none"
    }
  ],
  "next_steps": [
    {
      "description": "Clear description of the step",
      "action": "One of: click, type, screenshot, wait, press, scroll, dragdrop",
      "target": {"location": "description of where to click"},
      "text": "Text to type if action is type" 
    }
  ]
}
`;

    return await this.generateJSON(prompt);
  }
}

module.exports = DeepseekClient;