import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class DeepseekClient:
    def __init__(self):
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY not found in environment variables")
            
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key
        )
    
    def generate_completion(self, prompt, temperature=0.7, max_tokens=2000):
        """Generate text using DeepSeek via OpenRouter"""
        try:
            # Convert string prompt to messages format if needed
            if isinstance(prompt, str):
                messages = [{"role": "user", "content": prompt}]
            else:
                messages = prompt
                
            completion = self.client.chat.completions.create(
                extra_headers={
                    "HTTP-Referer": "https://ai-desktop-agent.com",
                    "X-Title": "AI Desktop Agent"
                },
                extra_body={},
                model="deepseek/deepseek-r1:free",
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            return completion.choices[0].message.content
            
        except Exception as e:
            print(f"Error calling DeepSeek API: {e}")
            raise

# Create singleton instance
deepseek_client = DeepseekClient()