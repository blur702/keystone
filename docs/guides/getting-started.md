# Getting Started with Keystone

This guide will help you set up and run the Keystone monorepo locally.

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v20 or higher)
- npm (v10 or higher)
- Python (v3.11 or higher)
- Git

## Installation Steps

1. Clone the repository
2. Install Node.js dependencies
3. Set up Python environment
4. Configure environment variables
5. Start development servers

## Detailed Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd keystone
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Python Setup

```bash
cd packages/python-services
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Environment Configuration

Create `.env` files in each package directory with the required variables.

### 5. Start Development

```bash
npm run dev
```

This will start all services concurrently using Turborepo.
