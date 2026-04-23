FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install Python toolchain and create an isolated virtualenv.
RUN apt-get update && \
  apt-get install -y python3 python3-pip python3-venv && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server/ .

EXPOSE 8000
CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
