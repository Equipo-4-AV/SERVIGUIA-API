FROM ubuntu:22.04

# Evitar prompts interactivos durante la instalación de paquetes en Ubuntu
ENV DEBIAN_FRONTEND=noninteractive

# Instalación de los pre-requisitos y creacion de venv dentro del contenedor
RUN apt-get update && \
  apt-get install -y python3 python3-pip python3-venv && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Instalación de todo dentro del contenedor
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8000
CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
