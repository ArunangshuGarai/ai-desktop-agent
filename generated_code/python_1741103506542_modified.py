def factorial(n):
    result = 1
    for i in range(1, n+1):
        result *= i
    return result

for num in range(1, 6):
    print(f"The factorial of {num} is {factorial(num)}")

def fibonacci(n):
    if n == 1:
        return 0
    elif n == 2:
        return 1
    a, b = 0, 1
    for _ in range(2, n):
        a, b = b, a + b
    return b

print("First 10 Fibonacci numbers:")
for num in range(1, 11):
    print(fibonacci(num))