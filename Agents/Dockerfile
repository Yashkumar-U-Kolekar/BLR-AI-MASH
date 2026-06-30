FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Set dynamic port for Cloud Run
ENV PORT=8000
EXPOSE $PORT

CMD ["python", "agent_server.py"]
