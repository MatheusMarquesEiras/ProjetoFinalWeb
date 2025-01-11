# Apresentação
Este trabalho foi desenvolvido no IFPR para a diciplina de "desenvolvimento de aplicações web" 

# Instalação
Primeira mente clone este repositorio
```bash
git clone https://github.com/MatheusMarquesEiras/ProjetoFinalWeb.git
```

Apos isso mude para a pasta do projeto
```bash
cd ProjetoFinalWeb
```

## Python
É recomendado ter o python 3.10.0 instalado

É recomendado criar um ambiente virtual ao inves de instalar globalmente no sistema (as duas formas funciona tanto com ambiente local quanto global mas o ambiente local serve par manter as coisas organizadas) e o ative na pasta raiz do projeto

```bash
python -m venv venv

# Windows
venv/scripts/activate

# Linux
source venv/bin/activate
```
Em seguida instale os pacotes com

```python
pip install -r requirements.txt
```

## Node
Primeiramente mude para a pasta frontend

```bash
cd frontend
```

Apos isso instale as dependencias
```bash
npm install @heroicons/react axios react react-dom react-icons react-router-dom
```

## Docker
Para o docker é necessario ter em mente se voce quiser rodar usando a GPU instale os pacotes necessarios para o doker ter acesso a sua GPU mas isso varia de sistema para sistema e de distro para distro

- Sem GPU:
deixe o arquivo docker compose desta forma

```yml
services:
  ollama:
    image: ollama/ollama
    #build: .
    container_name: ollama
    volumes:
      - ../backend/backup:/root/.ollama
    ports:
      - 11434:11434
    #deploy:
      #resources:
        #reservations:
          #devices:
            #- driver: nvidia
              #count: all
              #capabilities: [gpu]
```

- Com GPU
deixe o arquivo docker compose desta forma e istale as ferramentas que o docker precisa para rodar no seu sistema operacional
```yml
services:
  ollama:
    image: ollama/ollama
    build: .
    container_name: ollama
    volumes:
      - ../backend/backup:/root/.ollama
    ports:
      - 11434:11434
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

# Inicialização

## 1. Docker 
Abra um novo terminal dedicado ao docker caso queira acessar o contaioner e apos ter selecionado os metodo de sua preferencia rode os comandos

```bash
cd docker
```

Para rodar o servidor ollama

```bash
docker-compose up -d
``` 

## 2. Python 
Abra um novo terminal na raiz do projeto e rode o comando 

```bash
python run.py
```

## 3. React

Abra um novo terminal na raiz do projeto e navegue ate a pasta frontend
```bash
cd frontend
```

em seguida rode o comando 
```bash
npm run dev
```

# Entrar na aplicação
Para entrar na aplicação use as credenciais 
```bash
# user
teste

# password
teste
```