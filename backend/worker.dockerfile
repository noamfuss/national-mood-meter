FROM python:3.13-alpine

RUN pip install uv

RUN apk update && apk add --no-cache tzdata && \
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone && \
    pip install uv && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/requirements.txt

RUN uv pip install --system --upgrade pip && \
    uv pip install --system --no-cache-dir feedparser requests google-genai python-dotenv

COPY . /app

CMD [ "python3", "worker.py"]