FROM python:3.13-slim

RUN pip install uv

WORKDIR /app

COPY requirements.txt /app/requirements.txt

RUN uv pip install --system --upgrade pip && \
    uv pip install --system --no-cache-dir -r requirements.txt

COPY . /app
EXPOSE 8000
CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]