from ollama import Client
import json    
#from backend.logs import Logger

class ServerOllama:
    def __init__(self):
        with open('config.json', 'r') as f:
            data = json.load(f)

        self.client = Client(host=data['LOCAL_BASE_URL'])
        # llama3:8b
        # tinydolphin:1.1b-v2.8-q2_K
        self.model_name = 'tinydolphin:1.1b-v2.8-q2_K'
    
    def pull_model(self, name:str = None):
        if name is None:
            name = self.model_name
        self.client.pull(name)
    
    def stream_server_request_response(self, conversation: list):
        system = [{'role': 'system', 'content': 'Você é uma assistente de inteligência artificial chamada Ana'},]
        messages  = conversation
        all_mesages = system + messages
        
        return self.client.chat(model=self.model_name, 
                                    messages=all_mesages,
                                              stream=True)

    def _bytes_to_mb(self, bytes_value):
        mb = int(bytes_value / 10**6)
        return f"{mb} MB"

    def list_models(self):
        models_classes = self.client.list()
        models_list = []

        for model in models_classes.models:
            models_list.append(dict({
                "name": model.model,
                "size": self._bytes_to_mb(model.size)
            }))
            
        return models_list
    
    def set_model(self, model: str):
        self.model_name = model
    
    def try_chat(self):
        try:
            self.client.chat(self.model_name, messages=[{'role': 'system', 'content': 'teste'},])
            return True
        except Exception as e:
            #Logger.info(e)
            return False
    
    def get_model(self):
        return self.model_name
    
    def delete_model(self, model_name: str):
        try:
            self.client.delete(model_name)
            return True
        
        except Exception as e:
            #Logger.info(e)
            return False

if __name__ == "__main__":
    Ser = ServerOllama()
    #Ser.pull_model('llama3:8b')
    print(Ser.list_models())
