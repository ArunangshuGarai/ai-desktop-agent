import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.deepseek_client import deepseek_client

def test_deepseek_api():
    try:
        print("Testing DeepSeek API via OpenRouter...")
        
        result = deepseek_client.generate_completion(
            "What is the meaning of life?"
        )
        
        print("\nAPI Response:")
        print(result)
        print("\nConnection successful!")
        
    except Exception as e:
        print(f"API test failed: {e}")

if __name__ == "__main__":
    test_deepseek_api()