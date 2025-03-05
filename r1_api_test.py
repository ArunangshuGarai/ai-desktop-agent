from openai import OpenAI

# Load API key from environment variables
import os
from dotenv import load_dotenv
load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY")
)

completion = client.chat.completions.create(
    extra_headers={
        "HTTP-Referer": "https://your-app-domain.com",  # Replace with your site URL
        "X-Title": "AI Desktop Agent",  # Your application name
    },
    model="deepseek/deepseek-r1:free",
    messages=[
        {
            "role": "user",
            "content": "What is the meaning of life?"
        }
    ]
)

print(completion.choices[0].message.content)