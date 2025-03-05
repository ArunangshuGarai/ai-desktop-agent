def factorial(n):
    result = 1
    for i in range(1, n+1):
        result *= i
    return result

for num in range(1, 6):
    print(f"The factorial of {num} is {factorial(num)}")