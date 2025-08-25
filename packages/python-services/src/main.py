"""Main application entry point for Python services."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Create FastAPI application
app = FastAPI(
    title="Keystone Python Services",
    description="Calculation and data processing services",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {"service": "python-services", "status": "operational"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "python-services"}


@app.get("/api/calculate")
async def calculate(a: float, b: float, operation: str = "add"):
    """Example calculation endpoint."""
    operations = {
        "add": a + b,
        "subtract": a - b,
        "multiply": a * b,
        "divide": a / b if b != 0 else None,
    }
    
    result = operations.get(operation)
    if result is None and operation == "divide" and b == 0:
        return {"error": "Division by zero"}
    
    return {
        "a": a,
        "b": b,
        "operation": operation,
        "result": result,
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
