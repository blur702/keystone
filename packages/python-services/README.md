# @keystone/python-services

Python calculation and data processing services.

## Overview

This package contains Python services responsible for:
- Complex mathematical calculations
- Data analysis and processing
- Machine learning models
- Statistical computations
- Report generation
- Integration with scientific libraries

## Structure

```
python-services/
├── src/
│   ├── api/          # FastAPI endpoints
│   ├── services/     # Business logic services
│   ├── models/       # Data models
│   ├── calculations/ # Calculation modules
│   ├── utils/        # Utility functions
│   └── main.py       # Application entry point
├── tests/            # Test suites
└── requirements.txt  # Python dependencies
```

## Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
npm run dev
# or
python -m uvicorn src.main:app --reload

# Run tests
npm test
# or
python -m pytest
```

## Requirements

- Python 3.11+
- pip
- Virtual environment recommended

## API Documentation

When running in development mode, API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Integration

This service integrates with the Node.js backend via REST API.
Endpoints are designed to handle computational tasks that are better suited for Python's scientific computing ecosystem.
